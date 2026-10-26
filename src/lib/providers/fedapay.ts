import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  PaymentStatusResult,
} from "./types";

/**
 * Adaptateur FedaPay officiel (v1 REST API) — Vérifié contre le SDK officiel `fedapay@1.2.5`
 *
 * Points vérifiés dans la documentation et le code source officiel FedaPay :
 * 1. Base URL :
 *    - Sandbox : https://sandbox-api.fedapay.com/v1
 *    - Live    : https://api.fedapay.com/v1
 * 2. Enveloppe JSON de réponse :
 *    - POST /v1/transactions renvoie `{ "v1/transaction": { id, reference, status, amount, ... } }`
 *    - GET  /v1/transactions/:id renvoie `{ "v1/transaction": { id, reference, status, ... } }`
 *    - POST /v1/transactions/:id/token renvoie `{ token, url }` (ou `{ "v1/token": { token, url } }`)
 * 3. Paiement direct sans redirection (push USSD Mobile Money Bénin) :
 *    - POST /v1/:mode avec `{ token, phone_number: { number: "97123456", country: "bj" } }`
 *    - Modes Bénin : "mtn" (MTN MoMo), "moov" (Moov Money), "celtiis" / "sbin" (Celtiis Cash — sinon fallback checkout hébergé)
 * 4. Statuts payés : `["approved", "transferred", "approved_partially_refunded", "transferred_partially_refunded"]`
 * 5. Événements Webhook :
 *    - `transaction.approved`, `transaction.transferred`, `transaction.canceled`, `transaction.declined`
 *    - Signature : en-tête `X-FEDAPAY-SIGNATURE` au format `t=<timestamp>,s=<hmac_sha256_hex>`
 */

const PAID_STATUSES = new Set([
  "approved",
  "transferred",
  "approved_partially_refunded",
  "transferred_partially_refunded",
]);

const FAILED_STATUSES = new Set(["declined", "canceled", "refunded"]);

function extractBeninLocalDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("229")) return digits.slice(3);
  return digits;
}

export class FedaPayProvider implements PaymentProvider {
  public readonly name = "fedapay" as const;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(opts?: { secretKey?: string; env?: string }) {
    this.secretKey = opts?.secretKey ?? process.env.FEDAPAY_SECRET_KEY ?? "";
    const env = opts?.env ?? process.env.FEDAPAY_ENV ?? "sandbox";
    this.baseUrl =
      env === "live" || env === "production"
        ? "https://api.fedapay.com/v1"
        : "https://sandbox-api.fedapay.com/v1";
  }

  private headers(): Record<string, string> {
    if (!this.secretKey) {
      throw new Error("FEDAPAY_SECRET_KEY_MISSING");
    }
    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
      "X-Source": "LoyerClair-Benin/1.0",
    };
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const nameParts = input.tenantName.trim().split(/\s+/);
    const firstname = nameParts[0] || "Locataire";
    const lastname = nameParts.slice(1).join(" ") || "LoyerClair";
    const localDigits = extractBeninLocalDigits(input.tenantPhone);

    const payload = {
      description: input.description,
      amount: Math.round(input.amount),
      currency: { iso: "XOF" },
      callback_url: input.callbackUrl,
      custom_metadata: {
        payment_id: input.paymentId,
        rent_period_id: input.rentPeriodId,
        operator: input.operator,
      },
      customer: {
        firstname,
        lastname,
        email: `locataire.${input.paymentId.slice(0, 8)}@loyerclair.bj`,
        phone_number: {
          number: `+229${localDigits}`,
          country: "bj",
        },
      },
    };

    const createRes = await fetch(`${this.baseUrl}/transactions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`FEDAPAY_CREATE_TX_ERROR (${createRes.status}): ${errText}`);
    }

    const createData = (await createRes.json()) as Record<string, unknown>;
    const txObj =
      (createData["v1/transaction"] as Record<string, unknown> | undefined) ??
      (createData.transaction as Record<string, unknown> | undefined) ??
      createData;

    const txId = String(txObj.id ?? "");
    const txRef = String(txObj.reference ?? txId);

    if (!txId) {
      throw new Error("FEDAPAY_MISSING_TRANSACTION_ID");
    }

    // Génération du token de paiement FedaPay : POST /v1/transactions/:id/token
    const tokenRes = await fetch(`${this.baseUrl}/transactions/${txId}/token`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({}),
    });

    let checkoutUrl: string | undefined;
    if (tokenRes.ok) {
      const tokenData = (await tokenRes.json()) as Record<string, unknown>;
      const tokenObj =
        (tokenData["v1/token"] as Record<string, unknown> | undefined) ??
        tokenData;
      checkoutUrl = typeof tokenObj.url === "string" ? tokenObj.url : undefined;
    }

    return {
      provider: "fedapay",
      providerRef: txId,
      providerTxId: txRef,
      checkoutUrl,
      status: "pending",
    };
  }

  async getStatus(providerRef: string): Promise<PaymentStatusResult> {
    const res = await fetch(
      `${this.baseUrl}/transactions/${encodeURIComponent(providerRef)}`,
      {
        method: "GET",
        headers: this.headers(),
      }
    );

    if (!res.ok) {
      throw new Error(`FEDAPAY_GET_STATUS_ERROR (${res.status})`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const txObj =
      (data["v1/transaction"] as Record<string, unknown> | undefined) ??
      (data.transaction as Record<string, unknown> | undefined) ??
      data;

    const rawStatus = String(txObj.status ?? "pending").toLowerCase();

    let status: PaymentStatusResult["status"] = "pending";
    if (PAID_STATUSES.has(rawStatus)) {
      status = "succeeded";
    } else if (rawStatus === "canceled") {
      status = "canceled";
    } else if (FAILED_STATUSES.has(rawStatus)) {
      status = "failed";
    }

    return {
      providerRef,
      status,
      raw: txObj,
    };
  }
}
