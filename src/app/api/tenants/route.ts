import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { DEFAULT_LANDLORD_ID, DEFAULT_ORG_ID } from "@/lib/data/loyerclair";
import { getNotificationProvider } from "@/lib/providers";
import { formatFCFA, normalizeBeninPhone } from "@/lib/utils";

const singleTenantSchema = z.object({
  ownerId: z.string().uuid().optional(),
  propertyId: z.string().optional(),
  fullName: z.string().min(2),
  phone: z.string().min(6),
  unitLabel: z.string().min(1),
  rentAmount: z.number().int().positive(),
  dueDay: z.number().int().min(1).max(28).optional().default(5),
});

const batchImportSchema = z.object({
  ownerId: z.string().uuid().optional(),
  propertyId: z.string().optional(),
  tenants: z.array(
    z.object({
      fullName: z.string().min(2),
      phone: z.string().min(6),
      unitLabel: z.string().min(1),
      rentAmount: z.number().int().positive(),
      dueDay: z.number().int().min(1).max(28).optional().default(5),
    })
  ),
});

const updateTenantSchema = z.object({
  tenantId: z.string().min(1),
  optOutReminders: z.boolean().optional(),
  notifyWhatsapp: z.boolean().optional(),
  notifySms: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Supporte à la fois l'ajout d'un locataire et l'import CSV multiple
    const batchParsed = batchImportSchema.safeParse(body);
    const items = batchParsed.success
      ? batchParsed.data.tenants.map((t) => ({
          ...t,
          ownerId: batchParsed.data.ownerId,
          propertyId: batchParsed.data.propertyId,
        }))
      : (() => {
          const single = singleTenantSchema.parse(body);
          return [single];
        })();

    const supabase = createSupabaseAdminClient();
    const notifier = getNotificationProvider();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const createdTenants: Array<Record<string, unknown>> = [];

    for (const item of items) {
      const ownerId = item.ownerId || DEFAULT_LANDLORD_ID;
      const phone = normalizeBeninPhone(item.phone);
      const slug = item.fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 8);
      const inviteToken = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      if (supabase) {
        let propId = item.propertyId;
        let orgId = DEFAULT_ORG_ID;

        if (!propId) {
          const { data: firstProp } = await supabase
            .from("properties")
            .select("id, org_id")
            .eq("owner_id", ownerId)
            .limit(1)
            .maybeSingle();
          propId = firstProp?.id ?? "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
          orgId = firstProp?.org_id ?? DEFAULT_ORG_ID;
        }

        const { data: unitRow } = await supabase
          .from("units")
          .insert({
            property_id: propId,
            org_id: orgId,
            owner_id: ownerId,
            label: item.unitLabel,
            rent_amount: item.rentAmount,
            due_day: item.dueDay ?? 5,
          })
          .select("id")
          .single();

        const { data: tenantRow, error: tenantErr } = await supabase
          .from("tenants")
          .insert({
            org_id: orgId,
            owner_id: ownerId,
            property_id: propId,
            unit_id: unitRow?.id ?? null,
            full_name: item.fullName,
            phone,
            unit_label: item.unitLabel,
            rent_amount: item.rentAmount,
            due_day: item.dueDay ?? 5,
            invite_token: inviteToken,
          })
          .select("*")
          .single();

        if (tenantErr || !tenantRow) {
          throw new Error(tenantErr?.message ?? "TENANT_INSERT_ERROR");
        }

        await supabase.from("rent_periods").insert({
          org_id: orgId,
          owner_id: ownerId,
          tenant_id: tenantRow.id,
          period_month: "2026-11",
          period_label: "Novembre 2026",
          amount_due: item.rentAmount,
          amount_paid: 0,
          due_date: `2026-11-${String(item.dueDay ?? 5).padStart(2, "0")}`,
          status: "pending",
        });

        createdTenants.push(tenantRow);
      } else {
        createdTenants.push({
          id: `t-${Date.now()}`,
          full_name: item.fullName,
          phone,
          unit_label: item.unitLabel,
          rent_amount: item.rentAmount,
          invite_token: inviteToken,
        });
      }

      await notifier.send({
        to: phone,
        channel: "whatsapp",
        message: `👋 Bonjour ${item.fullName}, voici votre lien sécurisé LoyerClair pour régler le loyer de ${item.unitLabel} (${formatFCFA(
          item.rentAmount
        )}) par MTN/Moov/Celtiis et recevoir votre reçu QR : ${appUrl}/t/${inviteToken}`,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        count: createdTenants.length,
        tenants: createdTenants,
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "TENANT_CREATE_ERROR";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (parsed.data.optOutReminders !== undefined) {
        updates.opt_out_reminders = parsed.data.optOutReminders;
      }
      if (parsed.data.notifyWhatsapp !== undefined) {
        updates.notify_whatsapp = parsed.data.notifyWhatsapp;
      }
      if (parsed.data.notifySms !== undefined) {
        updates.notify_sms = parsed.data.notifySms;
      }

      const { data, error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", parsed.data.tenantId)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, tenant: data });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "TENANT_UPDATE_ERROR";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
