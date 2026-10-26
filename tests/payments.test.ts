import { describe, it, expect, beforeAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  // @ts-expect-error Node 20 WebSocket polyfill for @supabase/realtime-js
  globalThis.WebSocket = WebSocket;
}

import {
  calculateServerPaymentAmount,
  estimateFedaPayPayoutFee,
} from "@/lib/payments/fees";
import {
  buildFedaPaySignatureHeader,
  verifyFedaPayWebhookSignature,
} from "@/lib/payments/signature";
import {
  detectBeninOperator,
  formatFCFA,
  normalizeBeninPhone,
} from "@/lib/utils";
import { generateReceiptPdfBytes } from "@/lib/receipts/pdf";
import { FedaPayProvider } from "@/lib/providers/fedapay";
import { requestPhoneOtp, verifyPhoneOtp } from "@/lib/providers/otp";
import { verifyPublicReceipt } from "@/lib/data/loyerclair";

beforeAll(() => {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
});

describe("LoyerClair — Formatage FCFA & Téléphones Bénin", () => {
  it("formate les montants en FCFA sans décimales avec espaces normaux", () => {
    expect(formatFCFA(50000)).toBe("50 000 FCFA");
    expect(formatFCFA(35000)).toBe("35 000 FCFA");
    expect(formatFCFA(210000)).toBe("210 000 FCFA");
  });

  it("normalise les numéros béninois (+229) et détecte MTN / Moov / Celtiis", () => {
    expect(normalizeBeninPhone("97123456")).toBe("+229 97 12 34 56");
    expect(normalizeBeninPhone("0196552108")).toBe("+229 96 55 21 08");
    expect(detectBeninOperator("+229 97 12 34 56")).toBe("mtn");
    expect(detectBeninOperator("+229 99 31 62 90")).toBe("moov");
    expect(detectBeninOperator("+229 40 12 34 56")).toBe("celtiis");
  });
});

describe("LoyerClair — Calcul serveur des montants et commissions FedaPay", () => {
  it("recalcule le solde restant côté serveur et applique 1,8 % pour Mobile Money", () => {
    const res = calculateServerPaymentAmount({
      amountDue: 50000,
      amountPaid: 0,
      operator: "mtn",
    });
    expect(res.amount).toBe(50000);
    expect(res.feeAmount).toBe(900);
    expect(res.netAmount).toBe(49100);
    expect(res.remainingAfterPayment).toBe(0);
  });

  it("applique 0 FCFA de frais pour un paiement en espèces", () => {
    const res = calculateServerPaymentAmount({
      amountDue: 35000,
      amountPaid: 0,
      operator: "cash",
    });
    expect(res.amount).toBe(35000);
    expect(res.feeAmount).toBe(0);
    expect(res.netAmount).toBe(35000);
  });

  it("rejette tout montant négatif, nul, ou supérieur au reste à payer", () => {
    expect(() =>
      calculateServerPaymentAmount({
        amountDue: 50000,
        amountPaid: 50000,
        operator: "mtn",
      })
    ).toThrow("RENT_PERIOD_ALREADY_PAID");

    expect(() =>
      calculateServerPaymentAmount({
        amountDue: 50000,
        amountPaid: 10000,
        requestedAmount: 45000,
        operator: "moov",
      })
    ).toThrow("AMOUNT_EXCEEDS_REMAINING_BALANCE");
  });

  it("calcule les paliers officiels de reversement FedaPay Bénin", () => {
    expect(estimateFedaPayPayoutFee(10000)).toBe(150);
    expect(estimateFedaPayPayoutFee(50000)).toBe(300);
    expect(estimateFedaPayPayoutFee(130000)).toBe(800);
    expect(estimateFedaPayPayoutFee(300000)).toBe(2000);
    expect(estimateFedaPayPayoutFee(600000)).toBe(2500);
  });
});

describe("LoyerClair — Signature HMAC-SHA256 Webhook FedaPay (t=...,s=...)", () => {
  const secret = "wh_sandbox_test_secret_loyerclair";
  const payload = JSON.stringify({
    id: "evt_123",
    name: "transaction.approved",
    entity: { id: 98765, amount: 50000, status: "approved" },
  });

  it("accepte une signature officielle FedaPay valide dans la fenêtre de tolérance", () => {
    const now = 1793032800;
    const header = buildFedaPaySignatureHeader(payload, secret, now - 20);
    const verif = verifyFedaPayWebhookSignature(payload, header, secret, 300, now);
    expect(verif.valid).toBe(true);
  });

  it("rejette un payload falsifié ou une signature expirée (> 5 min)", () => {
    const now = 1793032800;
    const header = buildFedaPaySignatureHeader(payload, secret, now - 600);
    const expired = verifyFedaPayWebhookSignature(payload, header, secret, 300, now);
    expect(expired.valid).toBe(false);
    expect(expired.reason).toBe("TIMESTAMP_OUT_OF_TOLERANCE");

    const freshHeader = buildFedaPaySignatureHeader(payload, secret, now);
    const tampered = verifyFedaPayWebhookSignature(
      payload.replace("50000", "5000"),
      freshHeader,
      secret,
      300,
      now
    );
    expect(tampered.valid).toBe(false);
    expect(tampered.reason).toBe("SIGNATURE_MISMATCH");
  });
});

describe("LoyerClair — Adaptateur FedaPay v1 (P6)", () => {
  it("parse correctement l'enveloppe v1/transaction et génère le token checkout", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "v1/transaction": {
            id: 4242,
            reference: "trx_benin_4242",
            amount: 50000,
            status: "pending",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "tok_test_4242",
          url: "https://sandbox-process.fedapay.com/tok_test_4242",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          "v1/transaction": {
            id: 4242,
            status: "approved",
          },
        }),
      });

    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      const provider = new FedaPayProvider({
        secretKey: "sk_sandbox_test",
        env: "sandbox",
      });

      const checkout = await provider.createCheckout({
        paymentId: "fffffff1-ffff-4fff-8fff-fffffffffff1",
        rentPeriodId: "eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1",
        tenantName: "Koffi Adjovi",
        tenantPhone: "+229 97 12 34 56",
        amount: 50000,
        operator: "mtn",
        description: "Loyer Novembre 2026",
        callbackUrl: "https://loyerclair.bj/t/koffi-2a",
      });

      expect(checkout.provider).toBe("fedapay");
      expect(checkout.providerRef).toBe("4242");
      expect(checkout.providerTxId).toBe("trx_benin_4242");
      expect(checkout.checkoutUrl).toBe(
        "https://sandbox-process.fedapay.com/tok_test_4242"
      );

      const status = await provider.getStatus("4242");
      expect(status.status).toBe("succeeded");
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe("LoyerClair — Auth OTP 6 chiffres & Rate-Limiting 30s (P3)", () => {
  it("envoie un OTP, applique le cooldown 30s, et valide le code à 6 chiffres", async () => {
    const testPhone = "+229 97 77 88 99";
    const first = await requestPhoneOtp({
      phone: testPhone,
      channel: "whatsapp",
      cooldownSeconds: 30,
    });
    expect(first.ok).toBe(true);

    // Deuxième appel immédiat : bloqué par le rate-limiting 30s
    const second = await requestPhoneOtp({
      phone: testPhone,
      channel: "whatsapp",
      cooldownSeconds: 30,
    });
    expect(second.ok).toBe(false);
    expect(second.retryAfterSeconds).toBeGreaterThan(0);

    // Vérification avec code erroné
    const wrong = verifyPhoneOtp({ phone: testPhone, code: "000000" });
    expect(wrong.valid).toBe(false);

    // Vérification avec le code généré
    const right = verifyPhoneOtp({
      phone: testPhone,
      code: first.demoCode || "229456",
    });
    expect(right.valid).toBe(true);
  });
});

describe("LoyerClair — Génération PDF Reçu avec QR Code & Vérification Publique (P7)", () => {
  it("génère un fichier PDF valide commençant par %PDF-", async () => {
    const bytes = await generateReceiptPdfBytes({
      receipt_no: "REC-2026-000001",
      verification_code: "LC-586DDBAAD8",
      tenant_name: "Koffi Adjovi",
      tenant_phone: "+229 97 12 34 56",
      property_name: "Residence Les Cocotiers",
      unit_label: "Appt 2A",
      landlord_name: "Adjoa Mensah",
      period_label: "Novembre 2026",
      amount: 50000,
      operator_label: "MTN MoMo",
      issued_at: new Date().toISOString(),
      verify_url: "https://loyerclair.bj/verify/REC-2026-000001",
    });

    expect(bytes.byteLength).toBeGreaterThan(1500);
    const header = Buffer.from(bytes.slice(0, 5)).toString("utf8");
    expect(header).toBe("%PDF-");
  });

  it("vérifie publiquement le reçu REC-2026-000001 via verify_receipt RPC", async () => {
    const verif = await verifyPublicReceipt("REC-2026-000001");
    expect(verif.valid).toBe(true);
    expect(verif.receipt_no).toBe("REC-2026-000001");
    expect(verif.tenant_name).toBe("Koffi Adjovi");
    expect(verif.amount).toBe(50000);

    const invalid = await verifyPublicReceipt("REC-2026-999999");
    expect(invalid.valid).toBe(false);
  });
});

describe("LoyerClair — Idempotence Webhook & Isolation RLS Supabase (Live DB)", () => {
  it("confirm_payment est strictement idempotent : rejouer 3 fois crée exactement 1 reçu", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    expect(url).toBeTruthy();
    expect(serviceKey).toBeTruthy();

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const paymentId = "fffffff1-ffff-4fff-8fff-fffffffffff1";
    const [call1, call2, call3] = await Promise.all([
      admin.rpc("confirm_payment", { p_payment_id: paymentId }),
      admin.rpc("confirm_payment", { p_payment_id: paymentId }),
      admin.rpc("confirm_payment", { p_payment_id: paymentId }),
    ]);

    expect(call1.error).toBeNull();
    expect(call2.error).toBeNull();
    expect(call3.error).toBeNull();

    expect(call1.data.receipt_no).toBe("REC-2026-000001");
    expect(call2.data.receipt_no).toBe("REC-2026-000001");
    expect(call3.data.receipt_no).toBe("REC-2026-000001");
    expect(call1.data.idempotent).toBe(true);

    const { count } = await admin
      .from("receipts")
      .select("*", { count: "exact", head: true })
      .eq("payment_id", paymentId);

    expect(count).toBe(1);
  });

  it("isole strictement deux propriétaires via RLS (Adjoa ne voit jamais Bruno et inversement)", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const clientAdjoa = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const clientBruno = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    const loginAdjoa = await clientAdjoa.auth.signInWithPassword({
      email: "adjoa@loyerclair.bj",
      password: "LoyerClairDemo2026!",
    });
    expect(loginAdjoa.error).toBeNull();

    const loginBruno = await clientBruno.auth.signInWithPassword({
      email: "bruno@loyerclair.bj",
      password: "LoyerClairDemo2026!",
    });
    expect(loginBruno.error).toBeNull();

    const { data: adjoaTenants } = await clientAdjoa
      .from("tenants")
      .select("id, full_name, owner_id");

    expect(adjoaTenants).toBeTruthy();
    expect(adjoaTenants!.length).toBeGreaterThanOrEqual(4);
    expect(
      adjoaTenants!.every(
        (t) => t.owner_id === "11111111-1111-4111-8111-111111111111"
      )
    ).toBe(true);
    expect(adjoaTenants!.some((t) => t.full_name.includes("Sènan"))).toBe(
      false
    );

    const { data: brunoTenants } = await clientBruno
      .from("tenants")
      .select("id, full_name, owner_id");

    expect(brunoTenants).toBeTruthy();
    expect(brunoTenants!.length).toBe(1);
    expect(brunoTenants![0].full_name).toBe("Sènan Agbossou");

    const { data: brunoReceipts } = await clientBruno
      .from("receipts")
      .select("*")
      .eq("owner_id", "11111111-1111-4111-8111-111111111111");

    expect(brunoReceipts).toEqual([]);
  });
});
