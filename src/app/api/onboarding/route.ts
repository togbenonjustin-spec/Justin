import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { DEFAULT_LANDLORD_ID, DEFAULT_ORG_ID } from "@/lib/data/loyerclair";
import { getNotificationProvider } from "@/lib/providers";
import {
  detectBeninOperator,
  formatFCFA,
  normalizeBeninPhone,
} from "@/lib/utils";

const onboardingSchema = z.object({
  ownerId: z.string().uuid().optional(),
  landlordName: z.string().min(2),
  payoutPhone: z.string().min(8),
  payoutOperator: z.enum(["mtn", "moov", "celtiis"]).optional(),
  propertyName: z.string().min(2),
  propertyCity: z.string().min(2).default("Cotonou"),
  propertyNeighborhood: z.string().optional().default(""),
  tenantName: z.string().min(2),
  tenantPhone: z.string().min(8),
  unitLabel: z.string().min(1),
  rentAmount: z.number().int().positive(),
  dueDay: z.number().int().min(1).max(28).optional().default(5),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_ONBOARDING_DATA", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const ownerId = d.ownerId || DEFAULT_LANDLORD_ID;
    const normalizedPayout = normalizeBeninPhone(d.payoutPhone);
    const normalizedTenantPhone = normalizeBeninPhone(d.tenantPhone);
    const operator = d.payoutOperator || detectBeninOperator(normalizedPayout);
    const inviteToken = `${d.tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`;

    const supabase = createSupabaseAdminClient();

    if (supabase) {
      await supabase
        .from("profiles")
        .update({
          full_name: d.landlordName,
          onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ownerId);

      // Récupérer ou créer l'organisation du propriétaire
      let orgId = DEFAULT_ORG_ID;
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", ownerId)
        .limit(1)
        .maybeSingle();

      if (existingOrg) {
        orgId = existingOrg.id;
        await supabase
          .from("organizations")
          .update({
            name: `Patrimoine ${d.landlordName}`,
            payout_phone: normalizedPayout,
            payout_operator: operator,
          })
          .eq("id", orgId);
      } else {
        const { data: newOrg } = await supabase
          .from("organizations")
          .insert({
            owner_id: ownerId,
            name: `Patrimoine ${d.landlordName}`,
            payout_phone: normalizedPayout,
            payout_operator: operator,
          })
          .select("id")
          .single();
        if (newOrg) orgId = newOrg.id;
      }

      // Créer le bien
      const { data: prop } = await supabase
        .from("properties")
        .insert({
          org_id: orgId,
          owner_id: ownerId,
          name: d.propertyName,
          city: d.propertyCity,
          neighborhood: d.propertyNeighborhood,
          units_count: 1,
        })
        .select("*")
        .single();

      const propId = prop?.id ?? "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

      // Créer le lot (unit)
      const { data: unit } = await supabase
        .from("units")
        .insert({
          property_id: propId,
          org_id: orgId,
          owner_id: ownerId,
          label: d.unitLabel,
          rent_amount: d.rentAmount,
          due_day: d.dueDay,
        })
        .select("*")
        .single();

      // Créer le premier locataire
      const { data: tenant } = await supabase
        .from("tenants")
        .insert({
          org_id: orgId,
          owner_id: ownerId,
          property_id: propId,
          unit_id: unit?.id ?? null,
          full_name: d.tenantName,
          phone: normalizedTenantPhone,
          unit_label: d.unitLabel,
          rent_amount: d.rentAmount,
          due_day: d.dueDay,
          invite_token: inviteToken,
        })
        .select("*")
        .single();

      if (tenant) {
        await supabase.from("rent_periods").insert({
          org_id: orgId,
          owner_id: ownerId,
          tenant_id: tenant.id,
          period_month: "2026-11",
          period_label: "Novembre 2026",
          amount_due: d.rentAmount,
          amount_paid: 0,
          due_date: `2026-11-${String(d.dueDay).padStart(2, "0")}`,
          status: "pending",
        });
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${appUrl}/t/${inviteToken}`;

    const notifier = getNotificationProvider();
    await notifier.send({
      to: normalizedTenantPhone,
      channel: "whatsapp",
      message: `👋 Bonjour ${d.tenantName}, votre bailleur ${
        d.landlordName
      } utilise LoyerClair pour le logement ${d.unitLabel} (${formatFCFA(
        d.rentAmount
      )}/mois). Réglez par Mobile Money et recevez votre reçu officiel QR instantanément : ${inviteLink}`,
    });

    return NextResponse.json(
      {
        ok: true,
        inviteToken,
        invitePath: `/t/${inviteToken}`,
        inviteLink,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ONBOARDING_ERROR";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
