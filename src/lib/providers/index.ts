import { FedaPayProvider } from "./fedapay";
import { MockPaymentProvider } from "./mock";
import { BeninNotificationProvider } from "./notifications";
import type { NotificationProvider, PaymentProvider } from "./types";

export function getPaymentProvider(): PaymentProvider {
  const mode = process.env.PAYMENT_PROVIDER ?? "mock";
  if (mode === "fedapay" && process.env.FEDAPAY_SECRET_KEY) {
    return new FedaPayProvider();
  }
  return new MockPaymentProvider();
}

export function getNotificationProvider(): NotificationProvider {
  return new BeninNotificationProvider();
}

export * from "./types";
export * from "./fedapay";
export * from "./mock";
export * from "./notifications";
export * from "./otp";
