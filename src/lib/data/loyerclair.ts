import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  calculateServerPaymentAmount,
  type PaymentOperator,
} from "@/lib/payments/fees";
import {
  getNotificationProvider,
  getPaymentProvider,
  setMockPaymentStatus,
} from "@/lib/providers";
import { generateReceiptPdfBytes } from "@/lib/receipts/pdf";
import { formatFCFA, getOperatorLabel, normalizeBeninPhone } from "@/lib/utils";

export const DEFAULT_LANDLORD_ID = "11111111-1111-4111-8111-111111111111";
export const DEFAULT_ORG_ID = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1";

export interface TenantItem {
  id: string;
  full_name: string;
  phone: string;
  unit_label: string;
  property_id: string;
  property_name: string;
  rent_amount: number;
  due_day: number;
  invite_token: string;
  opt_out_reminders: boolean;
  current_period_id: string;
  period_label: string;
  amount_due: number;
  amount_paid: number;
  remaining: number;
  status: "pending" | "partial" | "paid" | "late";
  due_date: string;
}

export interface PropertyItem {
  id: string;
  name: string;
  city: string;
  neighborhood: string;
  address: string;
  units_count: number;
  occupied_count: number;
  monthly_expected: number;
}

export interface ReceiptItem {
  id: string;
  receipt_no: string;
  verification_code: string;
  payment_id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_phone: string;
  property_name: string;
  unit_label: string;
  landlord_name: string;
  period_label: string;
  amount: number;
  operator_label: string;
  issued_at: string;
  pdf_url: string | null;
}

export interface MonthlyChartPoint {
  month: string;
  label: string;
  expected: number;
  collected: number;
  rate: number;
}

export interface ReminderSettings {
  j_minus_3: boolean;
  j_day: boolean;
  j_plus_1: boolean;
  j_plus_3: boolean;
  j_plus_7: boolean;
  weekly_summary: boolean;
  template_before: string;
  template_day: string;
  template_late: string;
}

export interface ReminderLogItem {
  id: string;
  tenant_name: string;
  recipient_phone: string;
  stage: string;
  channel: "whatsapp" | "sms";
  message: string;
  status: string;
  sent_at: string;
}

export interface LandlordDashboardData {
  landlord: {
    id: string;
    full_name: string;
    phone: string;
    org_id: string;
    org_name: string;
    payout_phone: string;
    payout_operator: string;
    onboarded: boolean;
  };
  period_label: string;
  stats: {
    expected_total: number;
    collected_total: number;
    unpaid_total: number;
    recovery_rate: number;
    tenants_count: number;
    paid_count: number;
    late_count: number;
    pending_count: number;
  };
  properties: PropertyItem[];
  tenants: TenantItem[];
  receipts: ReceiptItem[];
  chart_history: MonthlyChartPoint[];
  reminder_settings: ReminderSettings;
  reminder_logs: ReminderLogItem[];
}

// ============================================================================
// FALLBACK IN-MEMORY STORE (si exécuté sans clé externe du tout)
// ============================================================================
const fallbackState: {
  initialized: boolean;
  seq: number;
  data: LandlordDashboardData;
  payments: Map<
    string,
    {
      id: string;
      tenant_id: string;
      rent_period_id: string;
      amount: number;
      fee_amount: number;
      net_amount: number;
      operator: PaymentOperator;
      payer_phone: string;
      provider: string;
      provider_ref: string;
      status: "pending" | "succeeded" | "failed" | "canceled";
      receipt_no?: string;
    }
  >;
} = {
  initialized: false,
  seq: 3,
  payments: new Map(),
  data: {
    landlord: {
      id: DEFAULT_LANDLORD_ID,
      full_name: "Adjoa Mensah",
      phone: "+229 97 00 11 22",
      org_id: DEFAULT_ORG_ID,
      org_name: "Patrimoine Adjoa Mensah",
      payout_phone: "+229 97 00 11 22",
      payout_operator: "mtn",
      onboarded: true,
    },
    period_label: "Novembre 2026",
    stats: {
      expected_total: 210000,
      collected_total: 130000,
      unpaid_total: 80000,
      recovery_rate: 62,
      tenants_count: 4,
      paid_count: 2,
      late_count: 1,
      pending_count: 1,
    },
    properties: [
      {
        id: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        name: "Résidence Les Cocotiers",
        city: "Cotonou",
        neighborhood: "Haie Vive",
        address: "Rue 412, Haie Vive, Cotonou",
        units_count: 6,
        occupied_count: 3,
        monthly_expected: 130000,
      },
      {
        id: "bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
        name: "Villa Ganhi Horizon",
        city: "Cotonou",
        neighborhood: "Ganhi",
        address: "Avenue Steinmetz, Cotonou",
        units_count: 2,
        occupied_count: 1,
        monthly_expected: 80000,
      },
    ],
    tenants: [
      {
        id: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd1",
        full_name: "Koffi Adjovi",
        phone: "+229 97 12 34 56",
        unit_label: "Appt 2A",
        property_id: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        property_name: "Résidence Les Cocotiers",
        rent_amount: 50000,
        due_day: 5,
        invite_token: "koffi-2a",
        opt_out_reminders: false,
        current_period_id: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1",
        period_label: "Novembre 2026",
        amount_due: 50000,
        amount_paid: 50000,
        remaining: 0,
        status: "paid",
        due_date: "2026-11-05",
      },
      {
        id: "ddddddd2-dddd-4ddd-8ddd-ddddddddddd2",
        full_name: "Awa Sossou",
        phone: "+229 96 55 21 08",
        unit_label: "Studio 4",
        property_id: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        property_name: "Résidence Les Cocotiers",
        rent_amount: 35000,
        due_day: 5,
        invite_token: "awa-s4",
        opt_out_reminders: false,
        current_period_id: "eeeeeee2-eeee-4eee-8eee-eeeeeeeeeee2",
        period_label: "Novembre 2026",
        amount_due: 35000,
        amount_paid: 0,
        remaining: 35000,
        status: "late",
        due_date: "2026-10-05",
      },
      {
        id: "ddddddd3-dddd-4ddd-8ddd-ddddddddddd3",
        full_name: "Jean Houngbo",
        phone: "+229 95 40 77 12",
        unit_label: "Appt 1B",
        property_id: "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        property_name: "Résidence Les Cocotiers",
        rent_amount: 45000,
        due_day: 5,
        invite_token: "jean-1b",
        opt_out_reminders: false,
        current_period_id: "eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3",
        period_label: "Novembre 2026",
        amount_due: 45000,
        amount_paid: 0,
        remaining: 45000,
        status: "pending",
        due_date: "2026-11-05",
      },
      {
        id: "ddddddd4-dddd-4ddd-8ddd-ddddddddddd4",
        full_name: "Fatou Dossou",
        phone: "+229 99 31 62 90",
        unit_label: "Villa 7",
        property_id: "bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
        property_name: "Villa Ganhi Horizon",
        rent_amount: 80000,
        due_day: 5,
        invite_token: "fatou-v7",
        opt_out_reminders: false,
        current_period_id: "eeeeeee4-eeee-4eee-8eee-eeeeeeeeeee4",
        period_label: "Novembre 2026",
        amount_due: 80000,
        amount_paid: 80000,
        remaining: 0,
        status: "paid",
        due_date: "2026-11-05",
      },
    ],
    receipts: [
      {
        id: "71132afd-b717-4e85-aeb4-c0434d999081",
        receipt_no: "REC-2026-000002",
        verification_code: "LC-AE2DAF7C3D",
        payment_id: "fffffff2-ffff-4fff-8fff-fffffffffff2",
        tenant_id: "ddddddd4-dddd-4ddd-8ddd-ddddddddddd4",
        tenant_name: "Fatou Dossou",
        tenant_phone: "+229 99 31 62 90",
        property_name: "Villa Ganhi Horizon",
        unit_label: "Villa 7",
        landlord_name: "Adjoa Mensah",
        period_label: "Novembre 2026",
        amount: 80000,
        operator_label: "Moov Money",
        issued_at: new Date().toISOString(),
        pdf_url: "/api/receipts/REC-2026-000002/pdf",
      },
      {
        id: "542dae67-7f30-4353-bfbf-123709340d68",
        receipt_no: "REC-2026-000001",
        verification_code: "LC-586DDBAAD8",
        payment_id: "fffffff1-ffff-4fff-8fff-fffffffffff1",
        tenant_id: "ddddddd1-dddd-4ddd-8ddd-ddddddddddd1",
        tenant_name: "Koffi Adjovi",
        tenant_phone: "+229 97 12 34 56",
        property_name: "Résidence Les Cocotiers",
        unit_label: "Appt 2A",
        landlord_name: "Adjoa Mensah",
        period_label: "Novembre 2026",
        amount: 50000,
        operator_label: "MTN MoMo",
        issued_at: new Date().toISOString(),
        pdf_url: "/api/receipts/REC-2026-000001/pdf",
      },
    ],
    chart_history: [
      { month: "2026-06", label: "Juin", expected: 210000, collected: 175000, rate: 83 },
      { month: "2026-07", label: "Juil.", expected: 210000, collected: 210000, rate: 100 },
      { month: "2026-08", label: "Août", expected: 210000, collected: 165000, rate: 79 },
      { month: "2026-09", label: "Sept.", expected: 210000, collected: 210000, rate: 100 },
      { month: "2026-10", label: "Oct.", expected: 210000, collected: 210000, rate: 100 },
      { month: "2026-11", label: "Nov.", expected: 210000, collected: 130000, rate: 62 },
    ],
    reminder_settings: {
      j_minus_3: true,
      j_day: true,
      j_plus_1: true,
      j_plus_3: true,
      j_plus_7: true,
      weekly_summary: true,
      template_before:
        "Bonjour {nom}, rappel amical : votre loyer de {montant} ({logement}) arrive à échéance le {date}. Réglez en 1 clic : {lien}",
      template_day:
        "Bonjour {nom}, votre loyer de {montant} ({logement}) est dû aujourd'hui ({periode}). Payez par MTN/Moov/Celtiis ici : {lien}",
      template_late:
        "Bonjour {nom}, votre loyer de {montant} ({logement}, {periode}) est en attente de règlement. Réglez dès maintenant pour recevoir votre reçu officiel : {lien}",
    },
    reminder_logs: [],
  },
};

function recomputeFallbackStats() {
  const tenants = fallbackState.data.tenants;
  const expected = tenants.reduce((s, t) => s + t.amount_due, 0);
  const collected = tenants.reduce((s, t) => s + t.amount_paid, 0);
  const unpaid = Math.max(0, expected - collected);
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  fallbackState.data.stats = {
    expected_total: expected,
    collected_total: collected,
    unpaid_total: unpaid,
    recovery_rate: rate,
    tenants_count: tenants.length,
    paid_count: tenants.filter((t) => t.status === "paid").length,
    late_count: tenants.filter((t) => t.status === "late").length,
    pending_count: tenants.filter((t) => t.status === "pending" || t.status === "partial").length,
  };
  const novPoint = fallbackState.data.chart_history.find((c) => c.month === "2026-11");
  if (novPoint) {
    novPoint.expected = expected;
    novPoint.collected = collected;
    novPoint.rate = rate;
  }
}

export async function getLandlordDashboard(
  ownerId: string = DEFAULT_LANDLORD_ID
): Promise<LandlordDashboardData> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    recomputeFallbackStats();
    return fallbackState.data;
  }

  try {
    const [profileRes, orgRes, propsRes, tenantsRes, periodsRes, receiptsRes, logsRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", ownerId).single(),
        supabase.from("organizations").select("*").eq("owner_id", ownerId).limit(1).single(),
        supabase.from("properties").select("*").eq("owner_id", ownerId).order("created_at", { ascending: true }),
        supabase
          .from("tenants")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("active", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("rent_periods")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("period_month", "2026-11"),
        supabase
          .from("receipts")
          .select("*")
          .eq("owner_id", ownerId)
          .order("issued_at", { ascending: false })
          .limit(20),
        supabase
          .from("reminder_logs")
          .select("*")
          .eq("owner_id", ownerId)
          .order("sent_at", { ascending: false })
          .limit(25),
      ]);

    if (profileRes.error || !profileRes.data) {
      recomputeFallbackStats();
      return fallbackState.data;
    }

    const propsMap = new Map<string, { name: string }>();
    const rawProps = propsRes.data ?? [];
    for (const p of rawProps) {
      propsMap.set(p.id, { name: p.name });
    }

    const periodByTenant = new Map<string, Record<string, unknown>>();
    for (const rp of periodsRes.data ?? []) {
      periodByTenant.set(String(rp.tenant_id), rp);
    }

    const tenants: TenantItem[] = (tenantsRes.data ?? []).map((t) => {
      const rp = periodByTenant.get(t.id);
      const amountDue = rp ? Number(rp.amount_due) : Number(t.rent_amount);
      const amountPaid = rp ? Number(rp.amount_paid) : 0;
      const remaining = Math.max(0, amountDue - amountPaid);
      const status = (rp?.status as TenantItem["status"]) ?? "pending";

      return {
        id: t.id,
        full_name: t.full_name,
        phone: t.phone,
        unit_label: t.unit_label,
        property_id: t.property_id,
        property_name: propsMap.get(t.property_id)?.name ?? "Résidence LoyerClair",
        rent_amount: Number(t.rent_amount),
        due_day: Number(t.due_day),
        invite_token: t.invite_token,
        opt_out_reminders: Boolean(t.opt_out_reminders),
        current_period_id: (rp?.id as string) ?? "",
        period_label: (rp?.period_label as string) ?? "Novembre 2026",
        amount_due: amountDue,
        amount_paid: amountPaid,
        remaining,
        status,
        due_date: (rp?.due_date as string) ?? "2026-11-05",
      };
    });

    const properties: PropertyItem[] = rawProps.map((p) => {
      const propTenants = tenants.filter((t) => t.property_id === p.id);
      return {
        id: p.id,
        name: p.name,
        city: p.city,
        neighborhood: p.neighborhood,
        address: p.address,
        units_count: Number(p.units_count),
        occupied_count: propTenants.length,
        monthly_expected: propTenants.reduce((s, t) => s + t.rent_amount, 0),
      };
    });

    const expectedTotal = tenants.reduce((s, t) => s + t.amount_due, 0);
    const collectedTotal = tenants.reduce((s, t) => s + t.amount_paid, 0);
    const unpaidTotal = Math.max(0, expectedTotal - collectedTotal);
    const recoveryRate =
      expectedTotal > 0 ? Math.round((collectedTotal / expectedTotal) * 100) : 0;

    const receipts: ReceiptItem[] = (receiptsRes.data ?? []).map((r) => ({
      id: r.id,
      receipt_no: r.receipt_no,
      verification_code: r.verification_code,
      payment_id: r.payment_id,
      tenant_id: r.tenant_id,
      tenant_name: r.tenant_name,
      tenant_phone: r.tenant_phone || "",
      property_name: r.property_name,
      unit_label: r.unit_label,
      landlord_name: r.landlord_name,
      period_label: r.period_label,
      amount: Number(r.amount),
      operator_label: r.operator_label,
      issued_at: r.issued_at,
      pdf_url: r.pdf_url || `/api/receipts/${encodeURIComponent(r.receipt_no)}/pdf`,
    }));

    const chartHistory: MonthlyChartPoint[] = [
      { month: "2026-06", label: "Juin", expected: 210000, collected: 175000, rate: 83 },
      { month: "2026-07", label: "Juil.", expected: 210000, collected: 210000, rate: 100 },
      { month: "2026-08", label: "Août", expected: 210000, collected: 165000, rate: 79 },
      { month: "2026-09", label: "Sept.", expected: 210000, collected: 210000, rate: 100 },
      { month: "2026-10", label: "Oct.", expected: 210000, collected: 210000, rate: 100 },
      {
        month: "2026-11",
        label: "Nov.",
        expected: expectedTotal,
        collected: collectedTotal,
        rate: recoveryRate,
      },
    ];

    const tenantNameById = new Map<string, string>();
    for (const t of tenants) tenantNameById.set(t.id, t.full_name);

    const reminderLogs: ReminderLogItem[] = (logsRes.data ?? []).map((l) => ({
      id: l.id,
      tenant_name: tenantNameById.get(l.tenant_id) ?? "Locataire",
      recipient_phone: l.recipient_phone,
      stage: l.stage,
      channel: l.channel,
      message: l.message,
      status: l.status,
      sent_at: l.sent_at,
    }));

    const orgReminderSettings = (orgRes.data?.reminder_settings ??
      fallbackState.data.reminder_settings) as ReminderSettings;

    return {
      landlord: {
        id: profileRes.data.id,
        full_name: profileRes.data.full_name || "Adjoa Mensah",
        phone: profileRes.data.phone,
        org_id: orgRes.data?.id ?? DEFAULT_ORG_ID,
        org_name: orgRes.data?.name ?? "Patrimoine LoyerClair",
        payout_phone: orgRes.data?.payout_phone ?? profileRes.data.phone,
        payout_operator: orgRes.data?.payout_operator ?? "mtn",
        onboarded: Boolean(profileRes.data.onboarded),
      },
      period_label: "Novembre 2026",
      stats: {
        expected_total: expectedTotal,
        collected_total: collectedTotal,
        unpaid_total: unpaidTotal,
        recovery_rate: recoveryRate,
        tenants_count: tenants.length,
        paid_count: tenants.filter((t) => t.status === "paid").length,
        late_count: tenants.filter((t) => t.status === "late").length,
        pending_count: tenants.filter(
          (t) => t.status === "pending" || t.status === "partial"
        ).length,
      },
      properties,
      tenants,
      receipts,
      chart_history: chartHistory,
      reminder_settings: orgReminderSettings,
      reminder_logs: reminderLogs,
    };
  } catch (err) {
    console.warn("[LoyerClair Data] Fallback vers store mémoire:", err);
    recomputeFallbackStats();
    return fallbackState.data;
  }
}

/**
 * Récupère les détails publics d'une invitation locataire /t/[token]
 */
export async function getTenantInviteByToken(token: string) {
  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("get_invite_details", {
      p_token: token,
    });
    if (!error && data) {
      return data as {
        tenant: {
          id: string;
          full_name: string;
          phone: string;
          unit_label: string;
          rent_amount: number;
          due_day: number;
          invite_token: string;
          opt_out_reminders: boolean;
          property_name: string;
          property_city: string;
          landlord_name: string;
        };
        current_period: {
          id: string;
          period_month: string;
          period_label: string;
          amount_due: number;
          amount_paid: number;
          remaining: number;
          due_date: string;
          status: "pending" | "partial" | "paid" | "late";
        } | null;
        receipts: ReceiptItem[];
      };
    }
  }

  // Fallback mémoire
  const tenant = fallbackState.data.tenants.find(
    (t) => t.invite_token === token || t.id === token
  );
  if (!tenant) return null;

  return {
    tenant: {
      id: tenant.id,
      full_name: tenant.full_name,
      phone: tenant.phone,
      unit_label: tenant.unit_label,
      rent_amount: tenant.rent_amount,
      due_day: tenant.due_day,
      invite_token: tenant.invite_token,
      opt_out_reminders: tenant.opt_out_reminders,
      property_name: tenant.property_name,
      property_city: "Cotonou",
      landlord_name: fallbackState.data.landlord.full_name,
    },
    current_period: {
      id: tenant.current_period_id,
      period_month: "2026-11",
      period_label: tenant.period_label,
      amount_due: tenant.amount_due,
      amount_paid: tenant.amount_paid,
      remaining: tenant.remaining,
      due_date: tenant.due_date,
      status: tenant.status,
    },
    receipts: fallbackState.data.receipts.filter((r) => r.tenant_id === tenant.id),
  };
}

/**
 * Crée une intention de paiement Mobile Money (montant TOUJOURS recalculé côté serveur)
 */
export async function initiateRentPayment(input: {
  rentPeriodId?: string;
  inviteToken?: string;
  operator: Exclude<PaymentOperator, "cash">;
  payerPhone: string;
  requestedAmount?: number;
  idempotencyKey?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const normalizedPhone = normalizeBeninPhone(input.payerPhone);

  if (supabase) {
    // Récupérer l'échéance côté serveur (ne jamais faire confiance au montant envoyé par le client)
    let periodQuery = supabase.from("rent_periods").select("*, tenants(*)");
    if (input.rentPeriodId) {
      periodQuery = periodQuery.eq("id", input.rentPeriodId);
    } else if (input.inviteToken) {
      const { data: tRow } = await supabase
        .from("tenants")
        .select("id")
        .eq("invite_token", input.inviteToken)
        .single();
      if (!tRow) throw new Error("TENANT_INVITE_NOT_FOUND");
      periodQuery = periodQuery
        .eq("tenant_id", tRow.id)
        .eq("period_month", "2026-11");
    } else {
      throw new Error("MISSING_RENT_PERIOD_OR_INVITE");
    }

    const { data: period, error: periodErr } = await periodQuery.single();
    if (periodErr || !period) {
      throw new Error("RENT_PERIOD_NOT_FOUND");
    }

    // Recalcul serveur strict du montant
    const calc = calculateServerPaymentAmount({
      amountDue: Number(period.amount_due),
      amountPaid: Number(period.amount_paid),
      requestedAmount: input.requestedAmount,
      operator: input.operator,
    });

    const tenantObj = Array.isArray(period.tenants)
      ? period.tenants[0]
      : period.tenants;

    // Création du payment en statut 'pending'
    const { data: paymentRow, error: payErr } = await supabase
      .from("payments")
      .insert({
        org_id: period.org_id,
        owner_id: period.owner_id,
        tenant_id: period.tenant_id,
        rent_period_id: period.id,
        amount: calc.amount,
        fee_amount: calc.feeAmount,
        net_amount: calc.netAmount,
        currency: "XOF",
        operator: input.operator,
        payer_phone: normalizedPhone,
        provider: (process.env.PAYMENT_PROVIDER ?? "mock") === "fedapay" ? "fedapay" : "mock",
        idempotency_key:
          input.idempotencyKey ||
          `pay-${period.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: "pending",
      })
      .select("*")
      .single();

    if (payErr || !paymentRow) {
      throw new Error(`PAYMENT_CREATE_ERROR: ${payErr?.message ?? "unknown"}`);
    }

    const provider = getPaymentProvider();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const checkout = await provider.createCheckout({
      paymentId: paymentRow.id,
      rentPeriodId: period.id,
      tenantName: tenantObj?.full_name ?? "Locataire",
      tenantPhone: normalizedPhone,
      amount: calc.amount,
      operator: input.operator,
      description: `Loyer ${period.period_label} - ${tenantObj?.unit_label ?? ""}`,
      callbackUrl: `${appUrl}/t/${tenantObj?.invite_token ?? ""}`,
    });

    await supabase
      .from("payments")
      .update({
        provider: checkout.provider,
        provider_ref: checkout.providerRef,
        provider_tx_id: checkout.providerTxId,
        checkout_url: checkout.checkoutUrl,
      })
      .eq("id", paymentRow.id);

    return {
      paymentId: paymentRow.id,
      rentPeriodId: period.id,
      amount: calc.amount,
      feeAmount: calc.feeAmount,
      netAmount: calc.netAmount,
      operator: input.operator,
      operatorLabel: getOperatorLabel(input.operator),
      provider: checkout.provider,
      providerRef: checkout.providerRef,
      checkoutUrl: checkout.checkoutUrl,
      status: "pending" as const,
    };
  }

  // Fallback mémoire
  const tenant = fallbackState.data.tenants.find(
    (t) =>
      t.current_period_id === input.rentPeriodId ||
      t.invite_token === input.inviteToken
  );
  if (!tenant) throw new Error("RENT_PERIOD_NOT_FOUND");

  const calc = calculateServerPaymentAmount({
    amountDue: tenant.amount_due,
    amountPaid: tenant.amount_paid,
    requestedAmount: input.requestedAmount,
    operator: input.operator,
  });

  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const providerRef = `MOCK-${input.operator.toUpperCase()}-${Date.now()}`;

  fallbackState.payments.set(paymentId, {
    id: paymentId,
    tenant_id: tenant.id,
    rent_period_id: tenant.current_period_id,
    amount: calc.amount,
    fee_amount: calc.feeAmount,
    net_amount: calc.netAmount,
    operator: input.operator,
    payer_phone: normalizedPhone,
    provider: "mock",
    provider_ref: providerRef,
    status: "pending",
  });

  return {
    paymentId,
    rentPeriodId: tenant.current_period_id,
    amount: calc.amount,
    feeAmount: calc.feeAmount,
    netAmount: calc.netAmount,
    operator: input.operator,
    operatorLabel: getOperatorLabel(input.operator),
    provider: "mock" as const,
    providerRef,
    checkoutUrl: `/t/${tenant.invite_token}?payment_id=${paymentId}`,
    status: "pending" as const,
  };
}

/**
 * Confirme atomiquement un paiement (idempotent : 1 seul reçu même si rejoué N fois),
 * génère et stocke le PDF avec QR dans Supabase Storage, et envoie le reçu par WhatsApp/SMS.
 */
export async function confirmPaymentAndIssueReceipt(params: {
  paymentId?: string;
  providerRef?: string;
  rawWebhook?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();

  if (supabase) {
    let targetPaymentId = params.paymentId;

    if (!targetPaymentId && params.providerRef) {
      const { data: foundPay } = await supabase
        .from("payments")
        .select("id")
        .eq("provider_ref", params.providerRef)
        .single();
      targetPaymentId = foundPay?.id;
    }

    if (!targetPaymentId) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
      "confirm_payment",
      {
        p_payment_id: targetPaymentId,
        p_provider_ref: params.providerRef ?? null,
        p_raw_webhook: params.rawWebhook ?? null,
      }
    );

    if (rpcErr || !rpcResult) {
      throw new Error(`CONFIRM_PAYMENT_RPC_ERROR: ${rpcErr?.message ?? "unknown"}`);
    }

    const resObj = rpcResult as {
      idempotent: boolean;
      payment_id: string;
      receipt_id: string;
      receipt_no: string;
      verification_code: string;
      amount: number;
      tenant_name: string;
      unit_label: string;
      property_name: string;
      landlord_name: string;
      period_label: string;
      operator_label: string;
      issued_at: string;
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify/${resObj.receipt_no}`;
    let pdfUrl = `/api/receipts/${encodeURIComponent(resObj.receipt_no)}/pdf`;

    // Si c'est la première confirmation (non rejouée), on génère le PDF vers Supabase Storage + notification WhatsApp
    if (!resObj.idempotent) {
      try {
        const pdfBytes = await generateReceiptPdfBytes({
          receipt_no: resObj.receipt_no,
          verification_code: resObj.verification_code,
          tenant_name: resObj.tenant_name,
          property_name: resObj.property_name,
          unit_label: resObj.unit_label,
          landlord_name: resObj.landlord_name,
          period_label: resObj.period_label,
          amount: Number(resObj.amount),
          operator_label: resObj.operator_label,
          issued_at: resObj.issued_at,
          verify_url: verifyUrl,
        });

        const storagePath = `${resObj.receipt_no}.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from("receipts")
          .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (!uploadErr) {
          const { data: pubUrl } = supabase.storage
            .from("receipts")
            .getPublicUrl(storagePath);
          if (pubUrl?.publicUrl) {
            pdfUrl = pubUrl.publicUrl;
          }
        }

        await supabase
          .from("receipts")
          .update({ pdf_url: pdfUrl })
          .eq("id", resObj.receipt_id);
      } catch (pdfErr) {
        console.warn("[LoyerClair PDF] Fallback route dynamique PDF:", pdfErr);
      }

      // Envoi automatique du reçu par WhatsApp/SMS
      const { data: rcpRow } = await supabase
        .from("receipts")
        .select("tenant_phone")
        .eq("id", resObj.receipt_id)
        .single();

      const notifier = getNotificationProvider();
      await notifier.send({
        to: rcpRow?.tenant_phone || "+229 97 00 00 00",
        channel: "whatsapp",
        message: `✅ LoyerClair — Paiement reçu ! Montant : ${formatFCFA(
          Number(resObj.amount)
        )} (${resObj.period_label} · ${resObj.unit_label}). Reçu officiel N° ${
          resObj.receipt_no
        } vérifiable ici : ${verifyUrl}`,
      });
    }

    if (params.providerRef) {
      setMockPaymentStatus(params.providerRef, "succeeded");
    }

    return {
      ...resObj,
      pdf_url: pdfUrl,
      verify_url: verifyUrl,
    };
  }

  // Fallback mémoire (idempotent)
  let payEntry = params.paymentId
    ? fallbackState.payments.get(params.paymentId)
    : undefined;
  if (!payEntry && params.providerRef) {
    for (const p of Array.from(fallbackState.payments.values())) {
      if (p.provider_ref === params.providerRef) {
        payEntry = p;
        break;
      }
    }
  }
  if (!payEntry) throw new Error("PAYMENT_NOT_FOUND");

  if (payEntry.status === "succeeded" && payEntry.receipt_no) {
    const existingRcp = fallbackState.data.receipts.find(
      (r) => r.receipt_no === payEntry!.receipt_no
    )!;
    return {
      idempotent: true,
      payment_id: payEntry.id,
      receipt_id: existingRcp.id,
      receipt_no: existingRcp.receipt_no,
      verification_code: existingRcp.verification_code,
      amount: existingRcp.amount,
      tenant_name: existingRcp.tenant_name,
      unit_label: existingRcp.unit_label,
      property_name: existingRcp.property_name,
      landlord_name: existingRcp.landlord_name,
      period_label: existingRcp.period_label,
      operator_label: existingRcp.operator_label,
      issued_at: existingRcp.issued_at,
      pdf_url: existingRcp.pdf_url,
    };
  }

  payEntry.status = "succeeded";
  const tenant = fallbackState.data.tenants.find((t) => t.id === payEntry!.tenant_id)!;
  tenant.amount_paid += payEntry.amount;
  tenant.remaining = Math.max(0, tenant.amount_due - tenant.amount_paid);
  tenant.status = tenant.remaining === 0 ? "paid" : "partial";

  const receiptNo = `REC-2026-${String(fallbackState.seq++).padStart(6, "0")}`;
  const verifCode = `LC-${Math.random().toString(16).slice(2, 12).toUpperCase()}`;
  payEntry.receipt_no = receiptNo;

  const newRcp: ReceiptItem = {
    id: `rcp-${Date.now()}`,
    receipt_no: receiptNo,
    verification_code: verifCode,
    payment_id: payEntry.id,
    tenant_id: tenant.id,
    tenant_name: tenant.full_name,
    tenant_phone: tenant.phone,
    property_name: tenant.property_name,
    unit_label: tenant.unit_label,
    landlord_name: fallbackState.data.landlord.full_name,
    period_label: tenant.period_label,
    amount: payEntry.amount,
    operator_label: getOperatorLabel(payEntry.operator),
    issued_at: new Date().toISOString(),
    pdf_url: `/api/receipts/${receiptNo}/pdf`,
  };

  fallbackState.data.receipts.unshift(newRcp);
  recomputeFallbackStats();

  return {
    idempotent: false,
    payment_id: payEntry.id,
    receipt_id: newRcp.id,
    receipt_no: newRcp.receipt_no,
    verification_code: newRcp.verification_code,
    amount: newRcp.amount,
    tenant_name: newRcp.tenant_name,
    unit_label: newRcp.unit_label,
    property_name: newRcp.property_name,
    landlord_name: newRcp.landlord_name,
    period_label: newRcp.period_label,
    operator_label: newRcp.operator_label,
    issued_at: newRcp.issued_at,
    pdf_url: newRcp.pdf_url,
  };
}

/**
 * Enregistre un paiement en espèces (propriétaire) et génère immédiatement le reçu officiel
 */
export async function recordCashRentPayment(params: {
  rentPeriodId: string;
  amount?: number;
  ownerId?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const actorId = params.ownerId ?? DEFAULT_LANDLORD_ID;

  if (supabase) {
    const { data, error } = await supabase.rpc("record_cash_payment", {
      p_rent_period_id: params.rentPeriodId,
      p_amount: params.amount ?? null,
      p_actor_id: actorId,
    });

    if (error || !data) {
      throw new Error(`CASH_PAYMENT_ERROR: ${error?.message ?? "unknown"}`);
    }

    const res = data as {
      payment_id: string;
      receipt_id: string;
      receipt_no: string;
      verification_code: string;
      amount: number;
      tenant_name: string;
      unit_label: string;
      property_name: string;
      landlord_name: string;
      period_label: string;
      operator_label: string;
      issued_at: string;
    };

    // Génère aussi le PDF et envoie la notification WhatsApp
    await confirmPaymentAndIssueReceipt({ paymentId: res.payment_id });
    return res;
  }

  // Fallback mémoire
  const tenant = fallbackState.data.tenants.find(
    (t) => t.current_period_id === params.rentPeriodId
  );
  if (!tenant) throw new Error("RENT_PERIOD_NOT_FOUND");
  const payAmount = params.amount ?? tenant.remaining;
  if (payAmount <= 0) throw new Error("ALREADY_PAID");

  const paymentId = `cash-${Date.now()}`;
  fallbackState.payments.set(paymentId, {
    id: paymentId,
    tenant_id: tenant.id,
    rent_period_id: tenant.current_period_id,
    amount: payAmount,
    fee_amount: 0,
    net_amount: payAmount,
    operator: "cash",
    payer_phone: tenant.phone,
    provider: "cash",
    provider_ref: `CASH-${Date.now()}`,
    status: "pending",
  });

  return confirmPaymentAndIssueReceipt({ paymentId });
}

export interface VerifiedReceiptResult {
  valid: boolean;
  code?: string;
  receipt_no?: string;
  verification_code?: string;
  tenant_name?: string;
  property_name?: string;
  unit_label?: string;
  landlord_name?: string;
  period_label?: string;
  amount?: number;
  operator_label?: string;
  issued_at?: string;
  pdf_url?: string;
}

/**
 * Vérifie publiquement un reçu via son numéro (REC-2026-XXXXXX) ou son code (LC-XXXXXXXXXX)
 */
export async function verifyPublicReceipt(
  code: string
): Promise<VerifiedReceiptResult> {
  const clean = code.trim().toUpperCase();
  const supabase = createSupabaseAdminClient();

  if (supabase) {
    const { data, error } = await supabase.rpc("verify_receipt", {
      p_code: clean,
    });
    if (!error && data) {
      return data as VerifiedReceiptResult;
    }
  }

  const found = fallbackState.data.receipts.find(
    (r) =>
      r.receipt_no.toUpperCase() === clean ||
      r.verification_code.toUpperCase() === clean
  );

  if (!found) {
    return { valid: false, code: clean };
  }

  return {
    valid: true,
    receipt_no: found.receipt_no,
    verification_code: found.verification_code,
    tenant_name: found.tenant_name,
    property_name: found.property_name,
    unit_label: found.unit_label,
    landlord_name: found.landlord_name,
    period_label: found.period_label,
    amount: found.amount,
    operator_label: found.operator_label,
    issued_at: found.issued_at,
    pdf_url: found.pdf_url ?? `/api/receipts/${found.receipt_no}/pdf`,
  };
}
