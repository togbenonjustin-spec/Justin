import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  initiateRentPayment,
  recordCashRentPayment,
} from "@/lib/data/loyerclair";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const createPaymentSchema = z.object({
  rentPeriodId: z.string().optional(),
  inviteToken: z.string().optional(),
  operator: z.enum(["mtn", "moov", "celtiis"]),
  payerPhone: z.string().min(6),
  requestedAmount: z.number().int().positive().optional(),
  idempotencyKey: z.string().optional(),
});

const cashPaymentSchema = z.object({
  rentPeriodId: z.string().min(1),
  amount: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_INPUT", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Important : tout montant envoyé dans body.amount est ignoré si non conforme au solde serveur
    const result = await initiateRentPayment(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PAYMENT_ERROR";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = cashPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_INPUT", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const receipt = await recordCashRentPayment({
      rentPeriodId: parsed.data.rentPeriodId,
      amount: parsed.data.amount,
    });

    return NextResponse.json({ ok: true, receipt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "CASH_PAYMENT_ERROR";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get("paymentId");
  if (!paymentId) {
    return NextResponse.json({ error: "MISSING_PAYMENT_ID" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { data: pay } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (!pay) {
      return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
    }

    const { data: rcp } = await supabase
      .from("receipts")
      .select("*")
      .eq("payment_id", paymentId)
      .maybeSingle();

    return NextResponse.json({
      paymentId: pay.id,
      status: pay.status,
      amount: pay.amount,
      operator: pay.operator,
      receipt: rcp ?? null,
    });
  }

  return NextResponse.json({ paymentId, status: "pending", receipt: null });
}
