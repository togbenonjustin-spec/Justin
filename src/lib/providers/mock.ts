import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  PaymentStatusResult,
} from "./types";

const mockStatuses = new Map<string, "pending" | "succeeded" | "failed" | "canceled">();

export function setMockPaymentStatus(
  providerRef: string,
  status: "pending" | "succeeded" | "failed" | "canceled"
) {
  mockStatuses.set(providerRef, status);
}

export class MockPaymentProvider implements PaymentProvider {
  public readonly name = "mock" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const providerRef = `MOCK-${input.operator.toUpperCase()}-${input.paymentId.slice(0, 8)}-${Date.now()}`;
    mockStatuses.set(providerRef, "pending");

    console.info(
      `[LoyerClair MockPayment] Checkout créé: ref=${providerRef}, op=${input.operator}, montant=${input.amount} FCFA, tel=${input.tenantPhone}`
    );

    return {
      provider: "mock",
      providerRef,
      providerTxId: providerRef,
      checkoutUrl: `${input.callbackUrl}?mock_ref=${encodeURIComponent(providerRef)}&payment_id=${encodeURIComponent(input.paymentId)}`,
      status: "pending",
    };
  }

  async getStatus(providerRef: string): Promise<PaymentStatusResult> {
    const status = mockStatuses.get(providerRef) ?? "pending";
    return {
      providerRef,
      status,
      raw: { providerRef, status, mock: true },
    };
  }
}
