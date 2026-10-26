import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/providers";
import { confirmPaymentAndIssueReceipt } from "@/lib/data/loyerclair";

function checkCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Cron de réconciliation (P6) :
 * Vérifie tous les paiements en statut `pending` créés il y a plus de 10 minutes
 * via `provider.getStatus(provider_ref)`. Si FedaPay confirme `approved`/`transferred`,
 * déclenche `confirm_payment` (atomique + idempotent).
 */
export async function GET(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED_CRON" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, reconciled: 0 });
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: pendingPayments, error } = await supabase
    .from("payments")
    .select("id, provider_ref, provider")
    .eq("status", "pending")
    .lt("created_at", tenMinutesAgo)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const provider = getPaymentProvider();
  let confirmedCount = 0;
  let failedCount = 0;

  for (const pay of pendingPayments ?? []) {
    if (!pay.provider_ref) continue;
    try {
      const statusRes = await provider.getStatus(pay.provider_ref);
      if (statusRes.status === "succeeded") {
        await confirmPaymentAndIssueReceipt({
          paymentId: pay.id,
          providerRef: pay.provider_ref,
          rawWebhook: { reconciled_by_cron: true, detail: statusRes.raw },
        });
        confirmedCount++;
      } else if (
        statusRes.status === "failed" ||
        statusRes.status === "canceled"
      ) {
        await supabase
          .from("payments")
          .update({
            status: statusRes.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pay.id);
        failedCount++;
      }
    } catch (err) {
      console.warn(`[ReconcileCron] Erreur sur payment ${pay.id}:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: pendingPayments?.length ?? 0,
    confirmedCount,
    failedCount,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
