import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate un montant en FCFA sans décimales avec séparateur d'espace insécable normalisé
 * Ex: 50000 -> "50 000 FCFA"
 */
export function formatFCFA(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return (
    safe
      .toLocaleString("fr-FR", { maximumFractionDigits: 0 })
      .replace(/[\u202f\u00a0]/g, " ") + " FCFA"
  );
}

/**
 * Normalise un numéro béninois au format international +229 XX XX XX XX (ou 01 XX XX XX XX)
 */
export function normalizeBeninPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("229")) {
    local = local.slice(3);
  }
  if (local.startsWith("01") && local.length === 10) {
    local = local.slice(2);
  }
  if (local.length === 8) {
    return `+229 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)}`;
  }
  return raw.trim() || "+229 97 00 00 00";
}

/**
 * Détecte automatiquement l'opérateur Mobile Money béninois à partir du préfixe
 */
export function detectBeninOperator(phone: string): "mtn" | "moov" | "celtiis" {
  const digits = phone.replace(/\D/g, "");
  let local = digits.startsWith("229") ? digits.slice(3) : digits;
  if (local.startsWith("01") && local.length === 10) {
    local = local.slice(2);
  }
  const prefix = local.slice(0, 2);
  const moovPrefixes = ["99", "98", "95", "94", "65", "64", "68", "60", "55"];
  const celtiisPrefixes = ["40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "92", "93"];
  if (moovPrefixes.includes(prefix)) return "moov";
  if (celtiisPrefixes.includes(prefix)) return "celtiis";
  return "mtn";
}

export function getOperatorLabel(op: string): string {
  switch (op.toLowerCase()) {
    case "mtn":
    case "mtn momo":
      return "MTN MoMo";
    case "moov":
    case "moov money":
      return "Moov Money";
    case "celtiis":
    case "celtiis cash":
      return "Celtiis Cash";
    case "cash":
    case "espèces":
      return "Espèces";
    default:
      return op;
  }
}

export function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "LC"
  );
}
