"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BellOff,
  CheckCircle2,
  Download,
  Lock,
  Receipt,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Card, Skeleton } from "@/components/ui/card";
import { AnimatedAmount } from "@/components/loyerclair/animated-amount";
import {
  AnimatedSuccessCheck,
  ConfettiBurst,
} from "@/components/loyerclair/confetti-burst";
import { ReceiptModal } from "@/components/loyerclair/receipt-modal";
import { ThemeToggle } from "@/components/loyerclair/theme-toggle";
import { TypewriterLoop } from "@/components/loyerclair/typewriter-loop";
import {
  detectBeninOperator,
  formatFCFA,
  getOperatorLabel,
} from "@/lib/utils";
import type { ReceiptItem } from "@/lib/data/loyerclair";

interface InvitePayload {
  tenant: {
    id: string;
    full_name: string;
    phone: string;
    unit_label: string;
    rent_amount: number;
    due_day: number;
    invite_token: string;
    opt_out_reminders: boolean;
    property_name: string;
    property_city: string;
    landlord_name: string;
  };
  current_period: {
    id: string;
    period_month: string;
    period_label: string;
    amount_due: number;
    amount_paid: number;
    remaining: number;
    due_date: string;
    status: "pending" | "partial" | "paid" | "late";
  } | null;
  receipts: ReceiptItem[];
}

export default function TenantPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "awa-s4";

  const [data, setData] = useState<InvitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [operator, setOperator] = useState<"mtn" | "moov" | "celtiis">("mtn");
  const [payerPhone, setPayerPhone] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptItem | null>(
    null
  );
  const [latestIssuedReceipt, setLatestIssuedReceipt] =
    useState<ReceiptItem | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [optOut, setOptOut] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const fetchInvite = useCallback(async () => {
    try {
      const res = await fetch(`/api/invite/${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setData(null);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as InvitePayload;
      setData(json);
      setPayerPhone(json.tenant.phone);
      setOperator(detectBeninOperator(json.tenant.phone));
      setOptOut(Boolean(json.tenant.opt_out_reminders));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvite();
  }, [fetchInvite]);

  const handlePayNow = async () => {
    if (!data?.current_period) return;
    setStep(2);

    try {
      // 1. Création côté serveur (montant recalculé serveur)
      const createRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentPeriodId: data.current_period.id,
          inviteToken: data.tenant.invite_token,
          operator,
          payerPhone,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        showToast(created.error || "Erreur lors de l'initiation du paiement");
        setStep(1);
        return;
      }

      // 2. Simulation de la validation USSD sur le téléphone (2.2s) puis confirmation atomique
      setTimeout(async () => {
        const confirmRes = await fetch("/api/dev/mock-confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: created.paymentId,
            providerRef: created.providerRef,
          }),
        });
        const confirmed = await confirmRes.json();

        if (confirmRes.ok && confirmed.receipt) {
          const rcp: ReceiptItem = {
            id: confirmed.receipt.receipt_id,
            receipt_no: confirmed.receipt.receipt_no,
            verification_code: confirmed.receipt.verification_code,
            payment_id: confirmed.receipt.payment_id,
            tenant_id: data.tenant.id,
            tenant_name: confirmed.receipt.tenant_name,
            tenant_phone: data.tenant.phone,
            property_name: confirmed.receipt.property_name,
            unit_label: confirmed.receipt.unit_label,
            landlord_name: confirmed.receipt.landlord_name,
            period_label: confirmed.receipt.period_label,
            amount: Number(confirmed.receipt.amount),
            operator_label: confirmed.receipt.operator_label,
            issued_at: confirmed.receipt.issued_at,
            pdf_url:
              confirmed.receipt.pdf_url ||
              `/api/receipts/${confirmed.receipt.receipt_no}/pdf`,
          };
          setLatestIssuedReceipt(rcp);
          setConfettiActive(true);
          setStep(3);
          await fetchInvite();
        } else {
          showToast("La confirmation a échoué.");
          setStep(1);
        }
      }, 2200);
    } catch {
      showToast("Erreur réseau.");
      setStep(1);
    }
  };

  const handleToggleOptOut = async () => {
    if (!data) return;
    const next = !optOut;
    setOptOut(next);
    await fetch(`/api/invite/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optOutReminders: next }),
    });
    showToast(
      next
        ? "Relances automatiques désactivées pour votre numéro."
        : "Relances automatiques réactivées."
    );
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-[520px] space-y-4 px-4 py-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-44 w-full rounded-[28px]" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-[520px] px-4 py-12 text-center">
        <Card className="p-6">
          <h1 className="font-display text-xl font-extrabold">
            Lien d’invitation introuvable
          </h1>
          <p className="mt-2 text-sm text-mut">
            Vérifiez le lien reçu par WhatsApp de votre propriétaire.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link href="/">Retour à LoyerClair</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const { tenant, current_period, receipts } = data;
  const remaining = current_period?.remaining ?? 0;
  const statusBadge =
    remaining === 0
      ? { label: "Payé", variant: "ok" as const }
      : current_period?.status === "late"
      ? { label: "En retard", variant: "bad" as const }
      : { label: "En attente", variant: "warn" as const };

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-4 py-5 pb-24">
      <ConfettiBurst active={confettiActive} />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-bg shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Barre supérieure */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => (step > 0 ? setStep(0) : window.history.back())}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card text-ink"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link href="/" className="font-display text-xl font-extrabold">
          Loyer<span className="text-acc">Clair</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* ÉTAPE 0 : Accueil Locataire */}
      {step === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="hero-gradient relative overflow-hidden rounded-[28px] p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-acc/35 blur-md" />
            <p className="text-sm opacity-90">
              Bonjour {tenant.full_name.split(" ")[0]} 👋
            </p>
            <h1 className="mt-1 font-display text-xl font-extrabold">
              Loyer de {current_period?.period_label ?? "Novembre 2026"} ·{" "}
              {tenant.unit_label}
            </h1>
            <p className="text-xs opacity-80">
              {tenant.property_name} ({tenant.property_city}) · Bailleur :{" "}
              {tenant.landlord_name}
            </p>
            <div className="mt-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95">
              <TypewriterLoop
                typeSpeedMs={26}
                deleteSpeedMs={14}
                holdCompleteMs={3200}
                holdEmptyMs={450}
                cursorClassName="text-acc"
                segments={[
                  {
                    text: "Réglez en 30 secondes par MTN MoMo, Moov Money ou Celtiis Cash · Reçu officiel QR sur WhatsApp.",
                  },
                ]}
              />
            </div>

            <div className="mt-4 font-display text-3xl font-extrabold">
              <AnimatedAmount
                value={remaining > 0 ? remaining : tenant.rent_amount}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Badge
                variant={statusBadge.variant}
                className="bg-white/20 text-white"
              >
                {statusBadge.label}
              </Badge>
              <span className="text-xs opacity-85">
                Échéance : {current_period?.due_date ?? "05/11/2026"}
              </span>
            </div>
          </div>

          {remaining > 0 ? (
            <Button
              onClick={() => {
                setConfettiActive(false);
                setStep(1);
              }}
              className="w-full text-lg"
              data-testid="btn-pay-now"
            >
              Payer maintenant ({formatFCFA(remaining)})
            </Button>
          ) : (
            <Card className="flex items-center justify-center gap-2 border-ok/30 bg-ok/10 p-4 text-center font-bold text-ok">
              <CheckCircle2 className="h-5 w-5" />
              Loyer réglé pour cette période, merci !
            </Card>
          )}

          {/* Historique des reçus */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-extrabold">
                Mes reçus officiels (QR)
              </h2>
              <span className="text-xs font-semibold text-mut">
                {receipts.length} reçu{receipts.length > 1 ? "s" : ""}
              </span>
            </div>

            {receipts.length === 0 ? (
              <p className="py-4 text-center text-sm text-mut">
                Aucun reçu pour le moment. Votre reçu officiel sera généré dès
                le paiement.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {receipts.map((r) => (
                  <div
                    key={r.receipt_no}
                    onClick={() => setSelectedReceipt(r)}
                    className="flex cursor-pointer items-center gap-3 py-3.5 transition hover:opacity-85"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pri/15 text-lg">
                      🧾
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm font-extrabold">
                        {r.receipt_no}
                      </div>
                      <div className="truncate text-xs text-mut">
                        {r.period_label} · {r.operator_label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-ok">
                        {formatFCFA(r.amount)}
                      </div>
                      <span className="text-[11px] font-semibold text-pri underline">
                        Voir QR
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Préférences & Opt-out relances */}
          <Card className="flex items-center justify-between p-4 text-xs">
            <div className="flex items-center gap-2.5 text-mut">
              <BellOff className="h-4 w-4 shrink-0" />
              <span>
                Rappels WhatsApp/SMS ({optOut ? "Désactivés" : "Activés"})
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleOptOut}
              className="font-bold text-pri underline"
            >
              {optOut ? "Réactiver" : "Me désinscrire"}
            </button>
          </Card>
        </motion.div>
      )}

      {/* ÉTAPE 1 : Choix de l'opérateur Mobile Money */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <Card className="p-5">
            <h2 className="font-display text-xl font-extrabold">
              Choisissez votre opérateur
            </h2>
            <p className="mt-1 text-sm text-mut">
              Montant à régler :{" "}
              <strong className="text-ink">{formatFCFA(remaining)}</strong>
            </p>

            <div className="my-4 grid grid-cols-3 gap-2.5">
              {(
                [
                  ["mtn", "🟡", "MTN MoMo"],
                  ["moov", "🔵", "Moov Money"],
                  ["celtiis", "🟣", "Celtiis Cash"],
                ] as const
              ).map(([code, icon, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setOperator(code)}
                  data-testid={`op-${code}`}
                  className={`flex flex-col items-center justify-center rounded-[18px] border-2 px-2 py-3.5 text-xs font-extrabold transition ${
                    operator === code
                      ? "-translate-y-0.5 border-pri bg-pri/10 text-pri shadow-md"
                      : "border-line bg-card text-ink"
                  }`}
                >
                  <span className="mb-1 text-2xl">{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label
                htmlFor="momo-phone"
                className="mb-1.5 block text-xs font-bold text-mut"
              >
                Numéro Mobile Money ({getOperatorLabel(operator)})
              </label>
              <Input
                id="momo-phone"
                type="tel"
                inputMode="tel"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="+229 97 12 34 56"
              />
            </div>

            <Button
              onClick={handlePayNow}
              className="mt-4 w-full text-base"
              data-testid="btn-confirm-pay"
            >
              Payer {formatFCFA(remaining)}
            </Button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-mut">
              <Lock className="h-3.5 w-3.5 text-ok" />
              Paiement sécurisé · Reçu officiel QR automatique
            </p>
          </Card>
        </motion.div>
      )}

      {/* ÉTAPE 2 : Attente validation USSD */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-12 text-center"
        >
          <Card className="p-8">
            <div className="ussd-pulse relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pri text-white">
              <Smartphone className="h-9 w-9" />
            </div>
            <h2 className="mt-7 font-display text-xl font-extrabold">
              Validez sur votre téléphone
            </h2>
            <p className="mt-2 text-sm text-mut">
              Saisissez votre code PIN{" "}
              <strong className="text-ink">{getOperatorLabel(operator)}</strong>{" "}
              sur le message USSD envoyé au{" "}
              <strong className="text-ink">{payerPhone}</strong>…
            </p>
            <div className="mt-4 text-xs font-semibold text-pri">
              Vérification temps réel en cours…
            </div>
          </Card>
        </motion.div>
      )}

      {/* ÉTAPE 3 : Succès + Coche SVG animée + Confettis + Reçu */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-6 text-center"
          data-testid="payment-success-screen"
        >
          <Card className="p-6">
            <AnimatedSuccessCheck />
            <h2 className="mt-4 font-display text-2xl font-extrabold">
              Paiement réussi !
            </h2>
            <p className="mt-1 text-sm text-mut">
              Votre reçu officiel{" "}
              <strong className="font-mono text-ink">
                {latestIssuedReceipt?.receipt_no}
              </strong>{" "}
              est prêt et a été envoyé par WhatsApp.
            </p>

            {latestIssuedReceipt && (
              <div className="mt-4 rounded-2xl border border-ok/30 bg-ok/10 p-3.5 text-left text-xs">
                <div className="flex items-center justify-between font-bold text-ok">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    Quittance officielle vérifiée
                  </span>
                  <span>{formatFCFA(latestIssuedReceipt.amount)}</span>
                </div>
                <div className="mt-1 text-mut">
                  N° {latestIssuedReceipt.receipt_no} · Code{" "}
                  {latestIssuedReceipt.verification_code}
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-2.5">
              {latestIssuedReceipt && (
                <>
                  <Button
                    onClick={() => setSelectedReceipt(latestIssuedReceipt)}
                    className="w-full"
                    data-testid="btn-view-receipt"
                  >
                    <Receipt className="h-4 w-4" />
                    Voir mon reçu avec QR Code
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <a
                      href={`/api/receipts/${encodeURIComponent(
                        latestIssuedReceipt.receipt_no
                      )}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger le reçu PDF
                    </a>
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                onClick={() => setStep(0)}
                className="w-full"
              >
                Retour à mon espace locataire
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      <ReceiptModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        onShareToast={showToast}
      />
    </main>
  );
}
