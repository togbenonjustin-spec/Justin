"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Home,
  Lock,
  Plus,
  Receipt,
  Send,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Card, Skeleton } from "@/components/ui/card";
import { AnimatedAmount } from "./animated-amount";
import { RecoveryRing } from "./recovery-ring";
import { AnimatedSuccessCheck, ConfettiBurst } from "./confetti-burst";
import { ReceiptModal } from "./receipt-modal";
import { ThemeToggle } from "./theme-toggle";
import { TypewriterLoop } from "./typewriter-loop";
import {
  detectBeninOperator,
  formatFCFA,
  getInitials,
  getOperatorLabel,
} from "@/lib/utils";
import type {
  LandlordDashboardData,
  ReceiptItem,
  TenantItem,
} from "@/lib/data/loyerclair";

export function InteractiveWorkspace({
  initialTab = "own",
}: {
  initialTab?: "own" | "ten" | "analytics" | "reminders";
}) {
  const [dashboard, setDashboard] = useState<LandlordDashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"own" | "ten" | "analytics" | "reminders">(
    initialTab
  );

  // État vue locataire interactive
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [tenantStep, setTenantStep] = useState<0 | 1 | 2 | 3>(0);
  const [operator, setOperator] = useState<"mtn" | "moov" | "celtiis">("mtn");
  const [payerPhone, setPayerPhone] = useState("+229 96 55 21 08");
  const [confetti, setConfetti] = useState(false);

  // Modales (Reçu, Ajout locataire, Import CSV, Ajout bien)
  const [activeReceipt, setActiveReceipt] = useState<ReceiptItem | null>(null);
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantPhone, setNewTenantPhone] = useState("");
  const [newTenantUnit, setNewTenantUnit] = useState("");
  const [newTenantRent, setNewTenantRent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Import CSV & Nouveau Bien
  const [csvText, setCsvText] = useState(
    "Codjo Mensah;+229 97 88 11 22;Studio 5;40000\nClarisse Talon;+229 95 22 33 44;Appt 3A;65000"
  );
  const [newPropName, setNewPropName] = useState("");
  const [newPropCity, setNewPropCity] = useState("Cotonou");
  const [newPropNeighborhood, setNewPropNeighborhood] = useState("");

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as LandlordDashboardData;
        setDashboard(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Actions Propriétaire : Relancer WhatsApp
  const handleRemindTenant = async (t: TenantItem) => {
    showToast(`Envoi de la relance WhatsApp à ${t.full_name}…`);
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: t.id,
        stage: t.status === "late" ? "J+3" : "J",
        channel: "whatsapp",
      }),
    });
    if (res.ok) {
      showToast(`Relance WhatsApp envoyée à ${t.full_name} 💬`);
      loadDashboard();
    } else {
      showToast("Erreur lors de l'envoi de la relance.");
    }
  };

  // Actions Propriétaire : Encaisser en Espèces (1 clic -> reçu atomique)
  const handleRecordCash = async (t: TenantItem) => {
    if (!t.current_period_id) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentPeriodId: t.current_period_id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.receipt) {
        showToast(
          `Paiement espèces enregistré · Reçu ${data.receipt.receipt_no} généré 🧾`
        );
        await loadDashboard();
      } else {
        showToast(data.error || "Erreur lors de l'enregistrement espèces");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Ajout rapide d'un locataire (Bottom sheet)
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    const rent = Number(newTenantRent);
    if (!newTenantName.trim() || !rent) {
      showToast("Nom et loyer en FCFA requis");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newTenantName.trim(),
          phone: newTenantPhone.trim() || "+229 97 00 00 00",
          unitLabel: newTenantUnit.trim() || "Nouveau lot",
          rentAmount: rent,
        }),
      });
      if (res.ok) {
        setAddTenantOpen(false);
        setNewTenantName("");
        setNewTenantPhone("");
        setNewTenantUnit("");
        setNewTenantRent("");
        showToast(`Invitation WhatsApp envoyée à ${newTenantName.trim()} 📲`);
        await loadDashboard();
      } else {
        showToast("Erreur lors de l'ajout du locataire.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Import CSV de locataires
  const handleImportCsv = async () => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsedTenants = lines
      .map((line) => {
        const [fullName, phone, unitLabel, rentStr] = line
          .split(/[;,]/)
          .map((s) => s.trim());
        const rentAmount = Number(rentStr?.replace(/\D/g, ""));
        if (!fullName || !rentAmount) return null;
        return {
          fullName,
          phone: phone || "+229 97 00 00 00",
          unitLabel: unitLabel || "Lot",
          rentAmount,
        };
      })
      .filter(Boolean);

    if (parsedTenants.length === 0) {
      showToast("Format attendu : Nom;Téléphone;Logement;Loyer");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenants: parsedTenants }),
      });
      if (res.ok) {
        showToast(
          `${parsedTenants.length} locataire(s) importés et invités sur WhatsApp ✅`
        );
        await loadDashboard();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Ajout d'un bien immobilier
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPropName.trim(),
          city: newPropCity.trim() || "Cotonou",
          neighborhood: newPropNeighborhood.trim(),
          unitsCount: 4,
        }),
      });
      if (res.ok) {
        setNewPropName("");
        setNewPropNeighborhood("");
        showToast("Nouveau bien immobilier ajouté 🏢");
        await loadDashboard();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Paiement Locataire dans le simulateur
  const selectedTenant =
    dashboard?.tenants.find((t) => t.id === selectedTenantId) ?? null;

  const handleTenantPay = async () => {
    if (!selectedTenant) return;
    setTenantStep(2);

    try {
      const createRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentPeriodId: selectedTenant.current_period_id,
          inviteToken: selectedTenant.invite_token,
          operator,
          payerPhone,
        }),
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        showToast(created.error || "Erreur paiement");
        setTenantStep(1);
        return;
      }

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
          setConfetti(true);
          setTenantStep(3);
          await loadDashboard();
        } else {
          setTenantStep(1);
        }
      }, 2100);
    } catch {
      setTenantStep(1);
    }
  };

  if (loading || !dashboard) {
    return (
      <div className="mx-auto max-w-[520px] space-y-4 px-4 py-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-44 w-full rounded-[28px]" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { landlord, stats, tenants, receipts, properties, chart_history } =
    dashboard;

  return (
    <div className="mx-auto max-w-[520px] px-4 pb-32 pt-4">
      <ConfettiBurst active={confetti} />

      {/* Toast flottant */}
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-bg shadow-xl"
        >
          {toast}
        </div>
      )}

      {/* En-tête */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-extrabold">
          Loyer<span className="text-acc">Clair</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/onboarding"
            className="rounded-xl border border-line bg-card px-3 py-2 text-xs font-bold text-pri hover:border-pri"
          >
            Onboarding 3 étapes
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* =====================================================================
          ONGLET 1 : PROPRIÉTAIRE (Fidèle à design/loyerclair-demo.html)
      ===================================================================== */}
      {tab === "own" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Carte Hero Émeraude + Halo Or */}
          <div className="hero-gradient relative overflow-hidden rounded-[28px] p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-acc/35 blur-md" />
            <h2 className="font-display text-2xl font-extrabold">
              Bonjour {landlord.full_name.split(" ")[0]} 👋
            </h2>
            <p className="mt-1 text-sm opacity-90">
              {dashboard.period_label} · {stats.tenants_count} locataires
            </p>
            <div className="mt-4 font-display text-3xl font-extrabold">
              <AnimatedAmount value={stats.collected_total} />
            </div>
            <p className="mt-0.5 text-sm opacity-85">encaissés ce mois</p>
          </div>

          {/* Grille Attendu / Impayés / Anneau de recouvrement */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <div className="text-xs font-medium text-mut">Attendu</div>
              <div className="mt-1 font-display text-xl font-extrabold">
                <AnimatedAmount value={stats.expected_total} />
              </div>
            </Card>
            <Card>
              <div className="text-xs font-medium text-mut">Impayés</div>
              <div className="mt-1 font-display text-xl font-extrabold text-bad">
                <AnimatedAmount value={stats.unpaid_total} />
              </div>
            </Card>
            <Card className="col-span-2">
              <RecoveryRing
                percentage={stats.recovery_rate}
                collected={stats.collected_total}
                expected={stats.expected_total}
                paidCount={stats.paid_count}
                totalCount={stats.tenants_count}
              />
            </Card>
          </div>

          {/* Liste des Locataires */}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold">
                Locataires
              </h3>
              <button
                type="button"
                onClick={() => setAddTenantOpen(true)}
                className="text-xs font-bold text-pri underline"
              >
                + Ajouter
              </button>
            </div>

            <div className="divide-y divide-line">
              {tenants.map((t) => {
                const statusInfo =
                  t.remaining === 0
                    ? { label: "Payé", variant: "ok" as const }
                    : t.status === "late"
                    ? { label: "En retard", variant: "bad" as const }
                    : { label: "En attente", variant: "warn" as const };

                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-1"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-gradient-to-br from-pri to-acc text-sm font-extrabold text-white">
                      {getInitials(t.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-bold text-ink">
                          {t.full_name}
                        </span>
                        <Link
                          href={`/t/${t.invite_token}`}
                          title="Ouvrir le lien direct du locataire"
                          className="text-mut hover:text-pri"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                      <div className="truncate text-xs text-mut">
                        {t.unit_label} · {formatFCFA(t.rent_amount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                      {t.remaining > 0 && (
                        <div className="mt-1.5 flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemindTenant(t)}
                          >
                            Relancer
                          </Button>
                          <Button
                            size="sm"
                            disabled={submitting}
                            onClick={() => handleRecordCash(t)}
                            data-testid={`btn-cash-${t.invite_token}`}
                          >
                            Espèces
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Derniers reçus */}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold">
                Derniers reçus officiels
              </h3>
              <a
                href="/api/export/csv"
                className="inline-flex items-center gap-1 text-xs font-bold text-pri underline"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </a>
            </div>

            <div className="divide-y divide-line">
              {receipts.slice(0, 6).map((r) => (
                <div
                  key={r.receipt_no}
                  onClick={() => setActiveReceipt(r)}
                  className="flex cursor-pointer items-center gap-3 py-3 transition hover:opacity-80"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-pri/15 text-lg">
                    🧾
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-extrabold">
                      {r.receipt_no}
                    </div>
                    <div className="truncate text-xs text-mut">
                      {r.tenant_name} · {r.operator_label}
                    </div>
                  </div>
                  <div className="font-extrabold text-ok">
                    {formatFCFA(r.amount)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Bouton flottant + (FAB) comme dans design/loyerclair-demo.html */}
          <button
            type="button"
            onClick={() => setAddTenantOpen(true)}
            aria-label="Ajouter un locataire"
            className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-[20px] bg-acc text-3xl font-bold text-[#1b1300] shadow-xl transition active:scale-95"
          >
            <Plus className="h-7 w-7" />
          </button>
        </motion.div>
      )}

      {/* =====================================================================
          ONGLET 2 : LOCATAIRE (Simulateur interactif + liens /t/[token])
      ===================================================================== */}
      {tab === "ten" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {!selectedTenant ? (
            <>
              <div className="hero-gradient rounded-[28px] p-6">
                <h2 className="font-display text-2xl font-extrabold">
                  Vue locataire
                </h2>
                <p className="mt-1.5 text-sm opacity-95">
                  <TypewriterLoop
                    typeSpeedMs={28}
                    deleteSpeedMs={14}
                    holdCompleteMs={3000}
                    holdEmptyMs={450}
                    cursorClassName="text-acc"
                    segments={[
                      {
                        text: "Simulez le lien reçu sur WhatsApp : aucun compte à créer, paiement en moins de 30 secondes et reçu QR immédiat.",
                      },
                    ]}
                  />
                </p>
              </div>

              <Card className="divide-y divide-line p-4">
                {tenants.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTenantId(t.id);
                      setPayerPhone(t.phone);
                      setOperator(detectBeninOperator(t.phone));
                      setTenantStep(0);
                    }}
                    className="flex cursor-pointer items-center gap-3 py-3.5 transition hover:opacity-80"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-gradient-to-br from-pri to-acc text-sm font-extrabold text-white">
                      {getInitials(t.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold">{t.full_name}</div>
                      <div className="text-xs text-mut">
                        {t.unit_label} · Ouvrir son lien d’invitation (/t/
                        {t.invite_token})
                      </div>
                    </div>
                    <Badge
                      variant={
                        t.remaining === 0
                          ? "ok"
                          : t.status === "late"
                          ? "bad"
                          : "warn"
                      }
                    >
                      {t.remaining === 0
                        ? "Payé"
                        : formatFCFA(t.remaining)}
                    </Badge>
                  </div>
                ))}
              </Card>
            </>
          ) : (
            <div className="space-y-4">
              {tenantStep === 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedTenantId(null)}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-pri"
                    >
                      ← Changer de locataire
                    </button>
                    <Link
                      href={`/t/${selectedTenant.invite_token}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-mut underline"
                    >
                      Ouvrir la page dédiée /t/{selectedTenant.invite_token}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="hero-gradient rounded-[28px] p-6">
                    <p className="text-sm opacity-90">
                      Bonjour {selectedTenant.full_name.split(" ")[0]} 👋
                    </p>
                    <h2 className="mt-1 font-display text-xl font-extrabold">
                      Loyer de {selectedTenant.period_label} ·{" "}
                      {selectedTenant.unit_label}
                    </h2>
                    <div className="mt-3 font-display text-3xl font-extrabold">
                      <AnimatedAmount
                        value={
                          selectedTenant.remaining > 0
                            ? selectedTenant.remaining
                            : selectedTenant.rent_amount
                        }
                      />
                    </div>
                    <div className="mt-2">
                      <Badge className="bg-white/20 text-white">
                        {selectedTenant.remaining === 0
                          ? "Payé"
                          : selectedTenant.status === "late"
                          ? "En retard"
                          : "En attente"}
                      </Badge>
                    </div>
                  </div>

                  {selectedTenant.remaining > 0 ? (
                    <Button
                      onClick={() => {
                        setConfetti(false);
                        setTenantStep(1);
                      }}
                      className="w-full"
                    >
                      Payer maintenant ({formatFCFA(selectedTenant.remaining)})
                    </Button>
                  ) : (
                    <Card className="p-4 text-center font-bold text-ok">
                      ✅ Loyer réglé, merci !
                    </Card>
                  )}

                  <Card className="p-4">
                    <h3 className="mb-2 font-display text-base font-extrabold">
                      Mes reçus
                    </h3>
                    <div className="divide-y divide-line">
                      {receipts
                        .filter((r) => r.tenant_id === selectedTenant.id)
                        .map((r) => (
                          <div
                            key={r.receipt_no}
                            onClick={() => setActiveReceipt(r)}
                            className="flex cursor-pointer items-center gap-3 py-3"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pri/15">
                              🧾
                            </div>
                            <div className="flex-1">
                              <div className="font-mono text-sm font-bold">
                                {r.receipt_no}
                              </div>
                              <div className="text-xs text-mut">
                                {r.period_label} · {r.operator_label}
                              </div>
                            </div>
                            <div className="font-extrabold text-ok">
                              {formatFCFA(r.amount)}
                            </div>
                          </div>
                        ))}
                      {receipts.filter((r) => r.tenant_id === selectedTenant.id)
                        .length === 0 && (
                        <p className="py-3 text-xs text-mut">
                          Aucun reçu pour le moment.
                        </p>
                      )}
                    </div>
                  </Card>
                </>
              )}

              {tenantStep === 1 && (
                <Card className="p-5">
                  <button
                    type="button"
                    onClick={() => setTenantStep(0)}
                    className="mb-3 text-xs font-bold text-pri"
                  >
                    ← Retour
                  </button>
                  <h2 className="font-display text-xl font-extrabold">
                    Choisissez votre opérateur
                  </h2>
                  <p className="text-xs text-mut">
                    Montant :{" "}
                    <strong className="text-ink">
                      {formatFCFA(selectedTenant.remaining)}
                    </strong>
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
                        className={`flex flex-col items-center rounded-[18px] border-2 px-2 py-3 text-xs font-bold transition ${
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

                  <label className="mb-1 block text-xs font-bold text-mut">
                    Numéro Mobile Money
                  </label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                  />

                  <Button onClick={handleTenantPay} className="mt-4 w-full">
                    Payer {formatFCFA(selectedTenant.remaining)}
                  </Button>
                  <p className="mt-2.5 flex items-center justify-center gap-1 text-xs text-mut">
                    <Lock className="h-3.5 w-3.5 text-ok" />
                    Paiement sécurisé · reçu QR automatique
                  </p>
                </Card>
              )}

              {tenantStep === 2 && (
                <Card className="p-8 text-center">
                  <div className="ussd-pulse relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pri text-white">
                    <Smartphone className="h-9 w-9" />
                  </div>
                  <h2 className="mt-6 font-display text-xl font-extrabold">
                    Validez sur votre téléphone
                  </h2>
                  <p className="mt-1.5 text-xs text-mut">
                    Saisissez votre code PIN {getOperatorLabel(operator)} pour
                    confirmer…
                  </p>
                </Card>
              )}

              {tenantStep === 3 && (
                <Card className="p-6 text-center">
                  <AnimatedSuccessCheck />
                  <h2 className="mt-4 font-display text-2xl font-extrabold">
                    Paiement réussi !
                  </h2>
                  <p className="mt-1 text-xs text-mut">
                    Votre reçu officiel est prêt et a été envoyé par WhatsApp.
                  </p>
                  <div className="mt-5 grid gap-2.5">
                    {receipts[0] && (
                      <Button
                        onClick={() => setActiveReceipt(receipts[0])}
                        className="w-full"
                      >
                        <Receipt className="h-4 w-4" />
                        Voir mon reçu ({receipts[0].receipt_no})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setTenantStep(0)}
                      className="w-full"
                    >
                      Retour
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* =====================================================================
          ONGLET 3 : ANALYTIQUE 6 MOIS, BIENS & IMPORT CSV (P4 & P8)
      ===================================================================== */}
      {tab === "analytics" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Graphique 6 mois Attendu vs Encaissé */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-extrabold">
                  Recouvrement sur 6 mois
                </h2>
                <p className="text-xs text-mut">
                  Loyers attendus vs encaissés (FCFA)
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <a href="/api/export/csv">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export CSV
                </a>
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-6 items-end gap-2 pt-4">
              {chart_history.map((pt) => {
                const maxVal = Math.max(
                  ...chart_history.map((c) => c.expected),
                  1
                );
                const expHeight = Math.round((pt.expected / maxVal) * 110);
                const colHeight = Math.round((pt.collected / maxVal) * 110);
                return (
                  <div
                    key={pt.month}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="text-[10px] font-extrabold text-pri">
                      {pt.rate}%
                    </div>
                    <div className="relative flex h-[115px] w-full items-end justify-center rounded-xl bg-line/40 p-1">
                      <div
                        style={{ height: `${expHeight}px` }}
                        className="w-full rounded-lg bg-pri/20"
                        title={`Attendu : ${formatFCFA(pt.expected)}`}
                      />
                      <div
                        style={{ height: `${colHeight}px` }}
                        className="absolute bottom-1 left-1 right-1 rounded-lg bg-pri transition-all duration-700"
                        title={`Encaissé : ${formatFCFA(pt.collected)}`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-mut">
                      {pt.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Gestion des Biens Immobiliers */}
          <Card className="p-5">
            <h2 className="font-display text-base font-extrabold">
              Mes biens immobiliers ({properties.length})
            </h2>
            <div className="mt-3 divide-y divide-line">
              {properties.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-mut">
                      {p.city} · {p.neighborhood || "Centre"} ·{" "}
                      {p.occupied_count} locataire(s)
                    </div>
                  </div>
                  <div className="text-right text-sm font-extrabold text-pri">
                    {formatFCFA(p.monthly_expected)}/mois
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleCreateProperty}
              className="mt-4 space-y-2.5 border-t border-line pt-4"
            >
              <div className="text-xs font-bold text-mut">
                Ajouter un nouveau bien
              </div>
              <Input
                value={newPropName}
                onChange={(e) => setNewPropName(e.target.value)}
                placeholder="Nom du bien (ex: Immeuble Akpakpa)"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newPropCity}
                  onChange={(e) => setNewPropCity(e.target.value)}
                  placeholder="Ville (Cotonou)"
                />
                <Input
                  value={newPropNeighborhood}
                  onChange={(e) => setNewPropNeighborhood(e.target.value)}
                  placeholder="Quartier"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !newPropName.trim()}
                className="w-full"
              >
                <Building2 className="h-4 w-4" />
                Enregistrer ce bien
              </Button>
            </form>
          </Card>

          {/* Import Liste / CSV Locataires */}
          <Card className="p-5">
            <h2 className="font-display text-base font-extrabold">
              Import rapide de locataires (CSV / Liste)
            </h2>
            <p className="mt-0.5 text-xs text-mut">
              Un locataire par ligne :{" "}
              <code className="font-mono text-ink">
                Nom complet;Téléphone;Logement;Loyer_FCFA
              </code>
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-2xl border border-line bg-bg p-3 font-mono text-xs text-ink focus:border-pri focus:outline-none"
            />
            <Button
              type="button"
              onClick={handleImportCsv}
              disabled={submitting}
              className="mt-2.5 w-full"
            >
              <Upload className="h-4 w-4" />
              Importer et envoyer les invitations WhatsApp
            </Button>
          </Card>
        </motion.div>
      )}

      {/* =====================================================================
          ONGLET 4 : RELANCES AUTOMATIQUES J-3, J, J+1/3/7 (P9)
      ===================================================================== */}
      {tab === "reminders" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="p-5">
            <h2 className="font-display text-base font-extrabold">
              Calendrier de relances WhatsApp / SMS
            </h2>
            <p className="mt-0.5 text-xs text-mut">
              Les locataires ayant déjà payé ou désactivé les rappels (opt-out)
              ne sont jamais dérangés.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
              {[
                ["J-3 (Pré-échéance)", dashboard.reminder_settings.j_minus_3],
                ["Jour J (Échéance)", dashboard.reminder_settings.j_day],
                ["J+1 (Rappel doux)", dashboard.reminder_settings.j_plus_1],
                ["J+3 (Relance retard)", dashboard.reminder_settings.j_plus_3],
                ["J+7 (Mise en demeure)", dashboard.reminder_settings.j_plus_7],
                [
                  "Résumé hebdo bailleur",
                  dashboard.reminder_settings.weekly_summary,
                ],
              ].map(([label, enabled]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-xl border border-line bg-bg px-3 py-2.5 font-semibold"
                >
                  <span>{label}</span>
                  <CheckCircle2
                    className={`h-4 w-4 ${enabled ? "text-ok" : "text-mut"}`}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                onClick={async () => {
                  const res = await fetch("/api/reminders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      stage: "J+1",
                      channel: "whatsapp",
                    }),
                  });
                  const d = await res.json();
                  showToast(
                    `${d.sentCount ?? 0} relance(s) WhatsApp envoyée(s) aux impayés ✅`
                  );
                  loadDashboard();
                }}
              >
                <Send className="h-4 w-4" />
                Relancer tous les impayés
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await fetch("/api/reminders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      stage: "weekly_summary",
                      channel: "whatsapp",
                    }),
                  });
                  if (res.ok) {
                    showToast("Résumé hebdomadaire envoyé au propriétaire 📊");
                    loadDashboard();
                  }
                }}
              >
                Recevoir mon résumé hebdo
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display text-sm font-extrabold">
              Historique des messages envoyés ({dashboard.reminder_logs.length})
            </h3>
            {dashboard.reminder_logs.length === 0 ? (
              <p className="mt-2 text-xs text-mut">
                Aucune relance envoyée durant cette session. Cliquez sur
                « Relancer » pour tester.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-line text-xs">
                {dashboard.reminder_logs.slice(0, 8).map((log) => (
                  <div key={log.id} className="py-2.5">
                    <div className="flex justify-between font-bold">
                      <span>
                        {log.tenant_name} ({log.recipient_phone})
                      </span>
                      <Badge variant="ok">{log.stage}</Badge>
                    </div>
                    <p className="mt-1 text-mut">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* =====================================================================
          MODAL SHEET : AJOUTER UN LOCATAIRE
      ===================================================================== */}
      {addTenantOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddTenantOpen(false);
          }}
        >
          <div className="w-full max-w-[520px] rounded-t-[28px] bg-bg p-5 pb-8 shadow-2xl sm:rounded-[28px]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold">
                Nouveau locataire
              </h2>
              <button
                onClick={() => setAddTenantOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-mut">
              Il recevra immédiatement son lien de paiement sur WhatsApp.
            </p>
            <form onSubmit={handleCreateTenant} className="space-y-3">
              <Input
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="Nom complet (ex: Sèdjro Ahouansou)"
                required
              />
              <Input
                type="tel"
                inputMode="tel"
                value={newTenantPhone}
                onChange={(e) => setNewTenantPhone(e.target.value)}
                placeholder="Numéro de téléphone (+229 97 00 00 00)"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  value={newTenantUnit}
                  onChange={(e) => setNewTenantUnit(e.target.value)}
                  placeholder="Logement (ex: Appt 3B)"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  value={newTenantRent}
                  onChange={(e) => setNewTenantRent(e.target.value)}
                  placeholder="Loyer mensuel (FCFA)"
                  required
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Envoi…" : "Envoyer l’invitation WhatsApp"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reçu Officiel QR */}
      <ReceiptModal
        receipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
        onShareToast={showToast}
      />

      {/* Barre de navigation inférieure glassmorphism */}
      <nav
        aria-label="Navigation principale LoyerClair"
        className="glass-nav fixed bottom-3.5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-[22px] border border-line p-1.5 shadow-xl"
      >
        <button
          type="button"
          onClick={() => setTab("own")}
          className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition ${
            tab === "own" ? "bg-pri text-onp" : "text-mut hover:text-ink"
          }`}
        >
          <Home className="h-4 w-4" />
          Propriétaire
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("ten");
            setTenantStep(0);
          }}
          className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition ${
            tab === "ten" ? "bg-pri text-onp" : "text-mut hover:text-ink"
          }`}
        >
          <Smartphone className="h-4 w-4" />
          Locataire
        </button>
        <button
          type="button"
          onClick={() => setTab("analytics")}
          className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition ${
            tab === "analytics" ? "bg-pri text-onp" : "text-mut hover:text-ink"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Biens & Stats
        </button>
        <button
          type="button"
          onClick={() => setTab("reminders")}
          className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition ${
            tab === "reminders" ? "bg-pri text-onp" : "text-mut hover:text-ink"
          }`}
        >
          <Bell className="h-4 w-4" />
          Relances
        </button>
      </nav>
    </div>
  );
}
