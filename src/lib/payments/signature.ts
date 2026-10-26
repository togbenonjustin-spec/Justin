import crypto from "crypto";

/**
 * Vérification cryptographique des signatures Webhook FedaPay (X-FEDAPAY-SIGNATURE)
 * Conforme au SDK officiel `fedapay` (src/Webhook.ts) :
 * - En-tête : `t=<timestamp>,s=<hmac_sha256_hex>`
 * - Payload signé : `${timestamp}.${rawBody}`
 * - Tolérance par défaut : 300 secondes (5 minutes)
 */

export const FEDAPAY_DEFAULT_TOLERANCE_SECONDS = 300;

export function computeFedaPaySignature(
  rawBody: string,
  secret: string,
  timestamp?: number
): string {
  const dataToSign =
    timestamp !== undefined ? `${timestamp}.${rawBody}` : rawBody;
  return crypto
    .createHmac("sha256", secret)
    .update(dataToSign, "utf8")
    .digest("hex");
}

export function buildFedaPaySignatureHeader(
  rawBody: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  const ts = Math.floor(timestamp);
  const sig = computeFedaPaySignature(rawBody, secret, ts);
  return `t=${ts},s=${sig}`;
}

export interface SignatureVerificationResult {
  valid: boolean;
  reason?: string;
  timestamp?: number;
}

function safeHexEqual(a: string, b: string): boolean {
  const cleanA = a.trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();
  if (cleanA.length !== cleanB.length || cleanA.length === 0) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cleanA, "utf8"),
      Buffer.from(cleanB, "utf8")
    );
  } catch {
    return false;
  }
}

export function verifyFedaPayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  toleranceSeconds: number = FEDAPAY_DEFAULT_TOLERANCE_SECONDS,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): SignatureVerificationResult {
  if (!secret || secret.trim().length === 0) {
    return { valid: false, reason: "MISSING_WEBHOOK_SECRET" };
  }
  if (!signatureHeader || typeof signatureHeader !== "string") {
    return { valid: false, reason: "MISSING_SIGNATURE_HEADER" };
  }

  const trimmed = signatureHeader.trim();

  // Format officiel SDK FedaPay : "t=1730000000,s=abcdef..."
  if (trimmed.includes("t=") && trimmed.includes(",")) {
    let timestamp = -1;
    const signatures: string[] = [];

    for (const part of trimmed.split(",")) {
      const [k, v] = part.trim().split("=");
      if (k === "t" && v) {
        const parsed = Number.parseInt(v, 10);
        if (!Number.isNaN(parsed)) timestamp = parsed;
      } else if ((k === "s" || k === "v1") && v) {
        signatures.push(v);
      }
    }

    if (timestamp === -1 || signatures.length === 0) {
      return { valid: false, reason: "MALFORMED_SIGNATURE_HEADER" };
    }

    const expected = computeFedaPaySignature(rawBody, secret, timestamp);
    const matched = signatures.some((sig) => safeHexEqual(sig, expected));

    if (!matched) {
      return { valid: false, reason: "SIGNATURE_MISMATCH", timestamp };
    }

    if (toleranceSeconds > 0) {
      const age = Math.abs(nowSeconds - timestamp);
      if (age > toleranceSeconds) {
        return { valid: false, reason: "TIMESTAMP_OUT_OF_TOLERANCE", timestamp };
      }
    }

    return { valid: true, timestamp };
  }

  // Fallback HMAC brut (si configuré sans timestamp)
  const rawExpected = computeFedaPaySignature(rawBody, secret);
  if (safeHexEqual(trimmed, rawExpected)) {
    return { valid: true };
  }

  return { valid: false, reason: "SIGNATURE_MISMATCH" };
}
