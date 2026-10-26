"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Sparkles,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/loyerclair/theme-toggle";

/**
 * P3 Onboarding propriétaire : strictement 3 écrans max (1 écran = 1 action)
 * Opérationnel en moins de 2 minutes.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<{
    invitePath: string;
    inviteLink: string;
  } | null>(null);

  // Écran 1 : Propriétaire
  const [landlordName, setLandlordName] = useState("Adjoa Mensah");
  const [payoutPhone, setPayoutPhone] = useState("+229 97 00 11 22");
  const [payoutOperator, setPayoutOperator] = useState<"mtn" | "moov" | "celtiis">("mtn");

  // Écran 2 : Premier Bien
  const [propertyName, setPropertyName] = useState("Résidence Les Cocotiers");
  const [propertyCity, setPropertyCity] = useState("Cotonou");
  const [propertyNeighborhood, setPropertyNeighborhood] = useState("Haie Vive");

  // Écran 3 : Premier Locataire
  const [tenantName, setTenantName] = useState("Sèdjro Ahouansou");
  const [tenantPhone, setTenantPhone] = useState("+229 97 44 55 66");
  const [unitLabel, setUnitLabel] = useState("Appt 3B");
  const [rentAmount, setRentAmount] = useState("55000");

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landlordName,
          payoutPhone,
          payoutOperator,
          propertyName,
          propertyCity,
          propertyNeighborhood,
          tenantName,
          tenantPhone,
          unitLabel,
          rentAmount: Number(rentAmount) || 50000,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la création.");
        setLoading(false);
        return;
      }

      setCreatedInvite({
        invitePath: data.invitePath,
        inviteLink: data.inviteLink,
      });
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card text-ink"
          aria-label="Retour au tableau de bord"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="font-display text-xl font-extrabold">
          Loyer<span className="text-acc">Clair</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Barre de progression 3 étapes */}
      <div className="mb-5 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-2 flex-1 rounded-full transition-all ${
              n <= step ? "bg-pri" : "bg-line"
            }`}
          />
        ))}
      </div>

      {createdInvite ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-ok/15 text-ok">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="font-display text-2xl font-extrabold">
              Votre espace est prêt ! 🎉
            </h1>
            <p className="mt-1.5 text-sm text-mut">
              Le lien de paiement de <strong>{tenantName}</strong> ({unitLabel}) a
              été envoyé sur WhatsApp.
            </p>

            <div className="mt-4 rounded-2xl border border-dashed border-pri/40 bg-pri/5 p-3.5 text-left text-xs">
              <div className="font-bold text-mut">
                Lien d’invitation locataire (sans création de compte) :
              </div>
              <div className="mt-1 truncate font-mono font-bold text-pri">
                {createdInvite.inviteLink}
              </div>
            </div>

            <div className="mt-5 grid gap-2.5">
              <Button onClick={() => router.push("/dashboard")} className="w-full">
                Ouvrir mon tableau de bord propriétaire
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(createdInvite.invitePath)}
                className="w-full"
              >
                Tester le lien du locataire ({tenantName})
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22 }}
        >
          {step === 1 && (
            <Card className="p-6">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-pri/10 px-3 py-1 text-xs font-bold text-pri">
                <UserCheck className="h-3.5 w-3.5" />
                Étape 1 sur 3 · Votre compte bailleur
              </div>
              <h1 className="font-display text-2xl font-extrabold">
                Où souhaitez-vous recevoir vos loyers ?
              </h1>
              <p className="mt-1 text-sm text-mut">
                Indiquez votre nom complet (affiché sur les reçus officiels) et
                votre numéro Mobile Money de reversement.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-mut">
                    Votre nom complet (Propriétaire / Gestionnaire)
                  </label>
                  <Input
                    value={landlordName}
                    onChange={(e) => setLandlordName(e.target.value)}
                    placeholder="Ex: Adjoa Mensah"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-mut">
                    Opérateur de réception
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["mtn", "🟡 MTN MoMo"],
                        ["moov", "🔵 Moov Money"],
                        ["celtiis", "🟣 Celtiis Cash"],
                      ] as const
                    ).map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setPayoutOperator(code)}
                        className={`min-h-[48px] rounded-2xl border-2 px-2 text-xs font-bold transition ${
                          payoutOperator === code
                            ? "border-pri bg-pri/10 text-pri"
                            : "border-line bg-bg text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-mut">
                    Numéro Mobile Money de reversement
                  </label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={payoutPhone}
                    onChange={(e) => setPayoutPhone(e.target.value)}
                    placeholder="+229 97 00 11 22"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!landlordName.trim() || !payoutPhone.trim()}
                  className="w-full"
                >
                  Continuer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card className="p-6">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-pri/10 px-3 py-1 text-xs font-bold text-pri">
                <Building2 className="h-3.5 w-3.5" />
                Étape 2 sur 3 · Votre bien immobilier
              </div>
              <h1 className="font-display text-2xl font-extrabold">
                Ajoutez votre premier immeuble ou maison
              </h1>
              <p className="mt-1 text-sm text-mut">
                Ce nom figurera sur les reçus officiels de vos locataires.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-mut">
                    Nom du bien ou de la résidence
                  </label>
                  <Input
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="Ex: Résidence Les Cocotiers"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-mut">
                      Ville
                    </label>
                    <Input
                      value={propertyCity}
                      onChange={(e) => setPropertyCity(e.target.value)}
                      placeholder="Cotonou"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-mut">
                      Quartier
                    </label>
                    <Input
                      value={propertyNeighborhood}
                      onChange={(e) => setPropertyNeighborhood(e.target.value)}
                      placeholder="Haie Vive, Akpakpa, Calavi…"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="w-1/3"
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!propertyName.trim()}
                    className="w-2/3"
                  >
                    Continuer
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="p-6">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-pri/10 px-3 py-1 text-xs font-bold text-pri">
                <UserPlus className="h-3.5 w-3.5" />
                Étape 3 sur 3 · Premier locataire
              </div>
              <h1 className="font-display text-2xl font-extrabold">
                Invitez votre premier locataire
              </h1>
              <p className="mt-1 text-sm text-mut">
                Il recevra immédiatement son lien de paiement sur WhatsApp (aucun
                compte à créer pour lui).
              </p>

              <form onSubmit={handleFinish} className="mt-5 space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-bold text-mut">
                    Nom complet du locataire
                  </label>
                  <Input
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Ex: Koffi Adjovi"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-mut">
                      Logement / Lot
                    </label>
                    <Input
                      value={unitLabel}
                      onChange={(e) => setUnitLabel(e.target.value)}
                      placeholder="Appt 2A, Studio 4…"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-mut">
                      Loyer mensuel (FCFA)
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                      placeholder="50000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-mut">
                    Téléphone WhatsApp / Mobile Money du locataire
                  </label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    placeholder="+229 97 12 34 56"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-bad/15 p-3 text-xs font-bold text-bad">
                    {error}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="w-1/3"
                  >
                    Retour
                  </Button>
                  <Button type="submit" disabled={loading} className="w-2/3">
                    <Sparkles className="h-4 w-4" />
                    {loading ? "Création…" : "Envoyer l'invitation"}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </motion.div>
      )}
    </main>
  );
}
