import { NextRequest, NextResponse } from "next/server";
import { verifyFedaPayWebhookSignature } from "@/lib/payments/signature";
import { confirmPaymentAndIssueReceipt } from "@/lib/data/loyerclair";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Webhook officiel FedaPay (/api/webhooks/fedapay)
 * 1. Lit le rawBody exact pour la vérification HMAC-SHA256 (`X-FEDAPAY-SIGNATURE` : `t=...,s=...`)
 * 2. Traite les événements `transaction.approved` / `transaction.transferred` / `transaction.canceled` / `transaction.declined`
 * 3. Appelle `confirm_payment` (atomique + idempotent : rejouer N fois le même webhook renvoie toujours le même reçu unique)
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-fedapay-signature");
    const secret = process.env.FEDAPAY_WEBHOOK_SECRET || "";

    const verification = verifyFedaPayWebhookSignature(
      rawBody,
      signatureHeader,
      secret
    );

    if (!verification.valid) {
      return NextResponse.json(
        {
          error: "INVALID_WEBHOOK_SIGNATURE",
          reason: verification.reason,
        },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody) as {
      id?: string;
      name?: string;
      object?: string;
      entity?: {
        id?: string | number;
        reference?: string;
        status?: string;
        amount?: number;
        custom_metadata?: {
          payment_id?: string;
          rent_period_id?: string;
        };
      };
    };

    const eventName = event.name ?? "";
    const entity = event.entity ?? {};
    const paymentId = entity.custom_metadata?.payment_id;
    const providerRef = entity.id ? String(entity.id) : entity.reference;

    if (
      eventName === "transaction.approved" ||
      eventName === "transaction.transferred"
    ) {
      const receipt = await confirmPaymentAndIssueReceipt({
        paymentId,
        providerRef,
        rawWebhook: event as unknown as Record<string, unknown>,
      });

      return NextResponse.json({
        received: true,
        event: eventName,
        idempotent: receipt.idempotent,
        receipt_no: receipt.receipt_no,
        receipt,
      });
    }

    if (
      eventName === "transaction.canceled" ||
      eventName === "transaction.declined"
    ) {
      const supabase = createSupabaseAdminClient();
      if (supabase && (paymentId || providerRef)) {
        const newStatus =
          eventName === "transaction.canceled" ? "canceled" : "failed";
        const query = supabase
          .from("payments")
          .update({
            status: newStatus,
            raw_webhook: event,
            updated_at: new Date().toISOString(),
          })
          .eq("status", "pending");

        if (paymentId) {
          await query.eq("id", paymentId);
        } else if (providerRef) {
          await query.eq("provider_ref", providerRef);
        }
      }

      return NextResponse.json({
        received: true,
        event: eventName,
        status: eventName === "transaction.canceled" ? "canceled" : "failed",
      });
    }

    return NextResponse.json({
      received: true,
      ignored: true,
      event: eventName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "WEBHOOK_PROCESSING_ERROR";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
