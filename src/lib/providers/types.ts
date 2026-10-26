import type { PaymentOperator } from "@/lib/payments/fees";

export interface CreateCheckoutInput {
  paymentId: string;
  rentPeriodId: string;
  tenantName: string;
  tenantPhone: string;
  amount: number;
  operator: Exclude<PaymentOperator, "cash">;
  description: string;
  callbackUrl: string;
}

export interface CreateCheckoutResult {
  provider: "mock" | "fedapay";
  providerRef: string;
  providerTxId?: string;
  checkoutUrl?: string;
  status: "pending" | "succeeded" | "failed";
}

export interface PaymentStatusResult {
  providerRef: string;
  status: "pending" | "succeeded" | "failed" | "canceled";
  raw?: unknown;
}

export interface PaymentProvider {
  name: "mock" | "fedapay";
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  getStatus(providerRef: string): Promise<PaymentStatusResult>;
}

export interface NotificationMessage {
  to: string;
  channel: "whatsapp" | "sms";
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  delivered: boolean;
  provider: string;
  messageId: string;
  channel: "whatsapp" | "sms";
}

export interface NotificationProvider {
  send(msg: NotificationMessage): Promise<NotificationResult>;
}
