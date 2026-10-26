import { NextRequest, NextResponse } from "next/server";
import { confirmPaymentAndIssueReceipt } from "@/lib/data/loyerclair";

/**
 * Endpoint de confirmation en mode démo / mock (/api/dev/mock-confirm)
 * Simule la validation du code PIN USSD Mobile Money par le locataire sur son téléphone.
 * Appelle le même pipeline atomique et idempotent `confirm_payment` que le webhook FedaPay.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      paymentId?: string;
      providerRef?: string;
    };

    if (!body.paymentId && !body.providerRef) {
      return NextResponse.json(
        { error: "MISSING_PAYMENT_ID_OR_PROVIDER_REF" },
        { status: 400 }
      );
    }

    const receipt = await confirmPaymentAndIssueReceipt({
      paymentId: body.paymentId,
      providerRef: body.providerRef,
      rawWebhook: {
        mock: true,
        confirmed_via: "dev_mock_confirm",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      idempotent: receipt.idempotent,
      receipt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "MOCK_CONFIRM_ERROR";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
