import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestPhoneOtp, verifyPhoneOtp } from "@/lib/providers/otp";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizeBeninPhone } from "@/lib/utils";
import { DEFAULT_LANDLORD_ID } from "@/lib/data/loyerclair";

const sendOtpSchema = z.object({
  phone: z.string().min(8),
  channel: z.enum(["whatsapp", "sms"]).optional().default("whatsapp"),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(8),
  code: z.string().length(6),
  role: z.enum(["landlord", "tenant"]).optional().default("landlord"),
  fullName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Numéro de téléphone invalide." },
        { status: 400 }
      );
    }

    const normalized = normalizeBeninPhone(parsed.data.phone);
    const result = await requestPhoneOtp({
      phone: normalized,
      channel: parsed.data.channel,
      cooldownSeconds: 30,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 429 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OTP_SEND_ERROR";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Veuillez saisir les 6 chiffres du code." },
        { status: 400 }
      );
    }

    const normalized = normalizeBeninPhone(parsed.data.phone);
    const verification = verifyPhoneOtp({
      phone: normalized,
      code: parsed.data.code,
    });

    if (!verification.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: "Code invalide ou expiré. Vérifiez votre message WhatsApp/SMS.",
          reason: verification.reason,
        },
        { status: 401 }
      );
    }

    // Recherche ou création automatique du profil dans Supabase
    const supabase = createSupabaseAdminClient();
    let profile = {
      id: DEFAULT_LANDLORD_ID,
      phone: normalized,
      full_name: parsed.data.fullName || "Adjoa Mensah",
      role: parsed.data.role,
      onboarded: true,
    };

    if (supabase) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("phone", normalized)
        .maybeSingle();

      if (existingProfile) {
        profile = {
          id: existingProfile.id,
          phone: existingProfile.phone,
          full_name: existingProfile.full_name,
          role: existingProfile.role,
          onboarded: Boolean(existingProfile.onboarded),
        };
      } else {
        // Première connexion : création du user Auth + Profile
        const cleanDigits = normalized.replace(/\D/g, "");
        const email = `user.${cleanDigits}@loyerclair.bj`;
        const { data: createdAuth } = await supabase.auth.admin.createUser({
          email,
          phone: `+${cleanDigits}`,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: {
            full_name: parsed.data.fullName || "",
            phone: normalized,
            role: parsed.data.role,
          },
        });

        if (createdAuth?.user) {
          await supabase.from("profiles").upsert({
            id: createdAuth.user.id,
            phone: normalized,
            full_name: parsed.data.fullName || "",
            role: parsed.data.role,
            onboarded: false,
          });
          profile = {
            id: createdAuth.user.id,
            phone: normalized,
            full_name: parsed.data.fullName || "",
            role: parsed.data.role,
            onboarded: false,
          };
        }
      }
    }

    return NextResponse.json({
      valid: true,
      profile,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OTP_VERIFY_ERROR";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
