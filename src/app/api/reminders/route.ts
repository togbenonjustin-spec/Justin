import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  DEFAULT_LANDLORD_ID,
  DEFAULT_ORG_ID,
  getLandlordDashboard,
} from "@/lib/data/loyerclair";
import { getNotificationProvider } from "@/lib/providers";
import { formatFCFA } from "@/lib/utils";

const sendReminderSchema = z.object({
  tenantId: z.string().optional(),
  stage: z
    .enum(["J-3", "J", "J+1", "J+3", "J+7", "manual", "weekly_summary"])
    .default("manual"),
  channel: z.enum(["whatsapp", "sms"]).default("whatsapp"),
  customMessage: z.string().optional(),
});

const updateSettingsSchema = z.object({
  ownerId: z.string().uuid().optional(),
  settings: z.object({
    j_minus_3: z.boolean(),
    j_day: z.boolean(),
    j_plus_1: z.boolean(),
    j_plus_3: z.boolean(),
    j_plus_7: z.boolean(),
    weekly_summary: z.boolean(),
    template_before: z.string().min(10),
    template_day: z.string().min(10),
    template_late: z.string().min(10),
  }),
});

function formatReminderMessage(
  template: string,
  vars: {
    nom: string;
    montant: string;
    logement: string;
    periode: string;
    date: string;
    lien: string;
  }
): string {
  return template
    .replace(/\{nom\}/g, vars.nom)
    .replace(/\{montant\}/g, vars.montant)
    .replace(/\{logement\}/g, vars.logement)
    .replace(/\{periode\}/g, vars.periode)
    .replace(/\{date\}/g, vars.date)
    .replace(/\{lien\}/g, vars.lien);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sendReminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    const { tenantId, stage, channel, customMessage } = parsed.data;
    const dashboard = await getLandlordDashboard(DEFAULT_LANDLORD_ID);
    const notifier = getNotificationProvider();
    const supabase = createSupabaseAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Résumé hebdomadaire pour le propriétaire
    if (stage === "weekly_summary") {
      const msg = `📊 Résumé hebdo LoyerClair (${dashboard.period_label}) : ${formatFCFA(
        dashboard.stats.collected_total
      )} encaissés sur ${formatFCFA(dashboard.stats.expected_total)} (${
        dashboard.stats.recovery_rate
      }%). ${dashboard.stats.late_count} loyer(s) en retard.`;

      await notifier.send({
        to: dashboard.landlord.phone,
        channel,
        message: msg,
      });

      if (supabase) {
        await supabase.from("reminder_logs").insert({
          org_id: dashboard.landlord.org_id,
          owner_id: dashboard.landlord.id,
          stage: "weekly_summary",
          channel,
          recipient_phone: dashboard.landlord.phone,
          message: msg,
          status: "sent",
        });
      }

      return NextResponse.json({ ok: true, sentCount: 1, message: msg });
    }

    // Relance d'un locataire spécifique ou de tous les impayés
    const targetTenants = tenantId
      ? dashboard.tenants.filter((t) => t.id === tenantId)
      : dashboard.tenants.filter((t) => t.remaining > 0);

    let sentCount = 0;
    let skippedOptOut = 0;
    const sentMessages: Array<{ tenant: string; message: string }> = [];

    for (const t of targetTenants) {
      if (t.opt_out_reminders) {
        skippedOptOut++;
        continue;
      }

      const template =
        stage === "J-3"
          ? dashboard.reminder_settings.template_before
          : stage === "J"
          ? dashboard.reminder_settings.template_day
          : dashboard.reminder_settings.template_late;

      const msg =
        customMessage ||
        formatReminderMessage(template, {
          nom: t.full_name,
          montant: formatFCFA(t.remaining > 0 ? t.remaining : t.amount_due),
          logement: t.unit_label,
          periode: t.period_label,
          date: t.due_date,
          lien: `${appUrl}/t/${t.invite_token}`,
        });

      await notifier.send({
        to: t.phone,
        channel,
        message: msg,
      });

      if (supabase) {
        await supabase.from("reminder_logs").insert({
          org_id: dashboard.landlord.org_id || DEFAULT_ORG_ID,
          owner_id: dashboard.landlord.id || DEFAULT_LANDLORD_ID,
          tenant_id: t.id,
          rent_period_id: t.current_period_id || null,
          stage,
          channel,
          recipient_phone: t.phone,
          message: msg,
          status: "sent",
        });
      }

      sentCount++;
      sentMessages.push({ tenant: t.full_name, message: msg });
    }

    return NextResponse.json({
      ok: true,
      sentCount,
      skippedOptOut,
      sentMessages,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "REMINDER_ERROR";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_SETTINGS", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ownerId = parsed.data.ownerId || DEFAULT_LANDLORD_ID;
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const { error } = await supabase
        .from("organizations")
        .update({
          reminder_settings: parsed.data.settings,
          updated_at: new Date().toISOString(),
        })
        .eq("owner_id", ownerId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, settings: parsed.data.settings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SETTINGS_UPDATE_ERROR";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
