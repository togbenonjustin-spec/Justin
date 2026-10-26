import { NextRequest, NextResponse } from "next/server";
import { getNotificationProvider } from "@/lib/providers";
import { normalizeBeninPhone } from "@/lib/utils";

/**
 * Webhook Supabase Auth "Send SMS Hook" (/api/auth/sms-hook)
 * Permet d'utiliser un fournisseur SMS/WhatsApp compatible Bénin (FasterMessage, Termii, InfoBip, WhatsApp Cloud API)
 * au lieu de dépendre de Twilio.
 */
export async function POST(req: NextRequest) {
  try {
    const hookSecret = process.env.SUPABASE_SMS_HOOK_SECRET;
    if (hookSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${hookSecret}`) {
        return NextResponse.json({ error: "UNAUTHORIZED_SMS_HOOK" }, { status: 401 });
      }
    }

    const payload = (await req.json()) as {
      user?: { phone?: string };
      sms?: { otp?: string };
    };

    const rawPhone = payload.user?.phone;
    const otp = payload.sms?.otp;

    if (!rawPhone || !otp) {
      return NextResponse.json(
        { error: "MISSING_PHONE_OR_OTP" },
        { status: 400 }
      );
    }

    const phone = normalizeBeninPhone(rawPhone);
    const notifier = getNotificationProvider();

    const result = await notifier.send({
      to: phone,
      channel: "whatsapp",
      message: `[LoyerClair Bénin] Votre code de connexion à 6 chiffres est : ${otp}. Valable 10 minutes.`,
    });

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      messageId: result.messageId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SMS_HOOK_ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
