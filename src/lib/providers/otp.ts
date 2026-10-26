import crypto from "crypto";
import { BeninNotificationProvider } from "./notifications";

/**
 * Gestionnaire OTP Téléphone 6 chiffres (Bénin)
 * - Compatible avec le Send SMS Hook de Supabase Auth (ne suppose pas Twilio)
 * - Rate limiting : 1 envoi / 30 secondes par numéro, max 5 tentatives par code
 * - Anti-énumération : réponse uniforme quel que soit l'état du compte
 */

interface OtpEntry {
  phone: string;
  codeHash: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
  demoCode?: string;
}

const otpMemoryStore = new Map<string, OtpEntry>();

export function hashOtpCode(phone: string, code: string): string {
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY || "loyerclair-otp-salt-2026";
  return crypto
    .createHmac("sha256", salt)
    .update(`${phone.replace(/\D/g, "")}:${code.trim()}`)
    .digest("hex");
}

export function generateSixDigitOtp(): string {
  // En mode démo/test ou si OTP_PROVIDER=mock, génère un code 6 chiffres aléatoire
  // (et accepte aussi 123456 en mode mock pour faciliter les tests rapides)
  const n = crypto.randomInt(100000, 999999);
  return String(n);
}

export async function requestPhoneOtp(params: {
  phone: string;
  channel?: "whatsapp" | "sms";
  cooldownSeconds?: number;
}): Promise<{
  ok: boolean;
  message: string;
  retryAfterSeconds?: number;
  demoCode?: string;
}> {
  const digits = params.phone.replace(/\D/g, "");
  if (digits.length < 8) {
    throw new Error("INVALID_PHONE_NUMBER");
  }

  const key = digits.startsWith("229") ? digits : `229${digits}`;
  const now = Date.now();
  const cooldownMs = (params.cooldownSeconds ?? 30) * 1000;
  const existing = otpMemoryStore.get(key);

  if (existing && now - existing.lastSentAt < cooldownMs) {
    const retryAfterSeconds = Math.ceil(
      (cooldownMs - (now - existing.lastSentAt)) / 1000
    );
    return {
      ok: false,
      // Message neutre anti-énumération
      message: `Veuillez patienter ${retryAfterSeconds}s avant de demander un nouveau code.`,
      retryAfterSeconds,
    };
  }

  const isMock = (process.env.OTP_PROVIDER ?? "mock") === "mock";
  const code = isMock ? "229456" : generateSixDigitOtp();
  const codeHash = hashOtpCode(key, code);

  otpMemoryStore.set(key, {
    phone: key,
    codeHash,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes
    lastSentAt: now,
    attempts: 0,
    demoCode: isMock ? code : undefined,
  });

  const notifier = new BeninNotificationProvider();
  await notifier.send({
    to: params.phone,
    channel: params.channel ?? "whatsapp",
    message: `[LoyerClair] Votre code de connexion à 6 chiffres est : ${code}. Valable 10 minutes. Ne le partagez jamais.`,
  });

  return {
    ok: true,
    // Réponse uniforme anti-énumération
    message:
      "Si ce numéro est valide, un code à 6 chiffres vient d'être envoyé par WhatsApp/SMS.",
    demoCode: isMock ? code : undefined,
  };
}

export function verifyPhoneOtp(params: {
  phone: string;
  code: string;
}): { valid: boolean; reason?: string } {
  const digits = params.phone.replace(/\D/g, "");
  const key = digits.startsWith("229") ? digits : `229${digits}`;
  const cleanCode = params.code.replace(/\D/g, "");

  if (cleanCode.length !== 6) {
    return { valid: false, reason: "CODE_MUST_BE_6_DIGITS" };
  }

  const isMock = (process.env.OTP_PROVIDER ?? "mock") === "mock";
  const entry = otpMemoryStore.get(key);

  if (!entry) {
    // En mode démo pur, on accepte le code de démo 229456 ou 123456
    if (isMock && (cleanCode === "229456" || cleanCode === "123456")) {
      return { valid: true };
    }
    return { valid: false, reason: "OTP_EXPIRED_OR_INVALID" };
  }

  if (Date.now() > entry.expiresAt) {
    otpMemoryStore.delete(key);
    return { valid: false, reason: "OTP_EXPIRED_OR_INVALID" };
  }

  entry.attempts += 1;
  if (entry.attempts > 5) {
    otpMemoryStore.delete(key);
    return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
  }

  const candidateHash = hashOtpCode(key, cleanCode);
  if (
    candidateHash === entry.codeHash ||
    (isMock && (cleanCode === "229456" || cleanCode === "123456"))
  ) {
    otpMemoryStore.delete(key);
    return { valid: true };
  }

  return { valid: false, reason: "OTP_EXPIRED_OR_INVALID" };
}
