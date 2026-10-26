/**
 * Calcul serveur des montants et commissions Mobile Money au Bénin (FedaPay 2026)
 * Règle non négociable : le montant d'un paiement est TOUJOURS recalculé côté serveur.
 */

export type PaymentOperator = "mtn" | "moov" | "celtiis" | "cash";

/**
 * Grille officielle FedaPay Bénin (vérifiée sur fedapay.com/tarifications) :
 * - Paiements entrants Mobile Money Bénin (MTN, Moov, Celtiis Cash) : 1,8 % TTC
 */
export const FEDAPAY_COLLECTION_FEE_RATE = 0.018;

export interface CalculatedPaymentAmounts {
  amount: number;
  feeAmount: number;
  netAmount: number;
  remainingAfterPayment: number;
}

/**
 * Recalcule côté serveur le montant exact à encaisser pour une échéance de loyer.
 * Empêche toute manipulation du montant par le client.
 */
export function calculateServerPaymentAmount(params: {
  amountDue: number;
  amountPaid: number;
  requestedAmount?: number;
  operator: PaymentOperator;
}): CalculatedPaymentAmounts {
  const amountDue = Math.round(Number(params.amountDue));
  const amountPaid = Math.round(Number(params.amountPaid));

  if (!Number.isFinite(amountDue) || amountDue <= 0) {
    throw new Error("INVALID_RENT_AMOUNT_DUE");
  }
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    throw new Error("INVALID_RENT_AMOUNT_PAID");
  }

  const remaining = Math.max(0, amountDue - amountPaid);
  if (remaining <= 0) {
    throw new Error("RENT_PERIOD_ALREADY_PAID");
  }

  let amount = remaining;
  if (params.requestedAmount !== undefined && params.requestedAmount !== null) {
    const req = Math.round(Number(params.requestedAmount));
    if (!Number.isFinite(req) || req <= 0) {
      throw new Error("INVALID_REQUESTED_AMOUNT");
    }
    if (req > remaining) {
      throw new Error("AMOUNT_EXCEEDS_REMAINING_BALANCE");
    }
    if (req < 100) {
      throw new Error("AMOUNT_BELOW_MINIMUM_100_FCFA");
    }
    amount = req;
  }

  const feeAmount =
    params.operator === "cash"
      ? 0
      : Math.round(amount * FEDAPAY_COLLECTION_FEE_RATE);
  const netAmount = Math.max(0, amount - feeAmount);

  return {
    amount,
    feeAmount,
    netAmount,
    remainingAfterPayment: remaining - amount,
  };
}

/**
 * Grille officielle FedaPay des frais de reversement (Payouts Mobile Money Bénin)
 * Source : https://www.fedapay.com/tarifications/
 */
export function estimateFedaPayPayoutFee(amountFcfa: number): number {
  const amount = Math.round(amountFcfa);
  if (amount <= 0) return 0;
  if (amount <= 10_000) return 150;
  if (amount <= 50_000) return 300;
  if (amount <= 150_000) return 800;
  if (amount <= 500_000) return 2_000;
  return 2_500;
}
