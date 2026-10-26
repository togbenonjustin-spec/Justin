import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { InteractiveWorkspace } from "@/components/loyerclair/interactive-workspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      {/* Bandeau d'accès rapide SaaS */}
      <header className="border-b border-line bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-pri font-display text-sm font-extrabold text-white">
              LC
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">
              Loyer<span className="text-acc">Clair</span>
            </span>
            <span className="hidden rounded-full bg-pri/10 px-2.5 py-0.5 text-[11px] font-bold text-pri sm:inline-block">
              Bénin · MTN · Moov · Celtiis
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <Link
              href="/verify/REC-2026-000001"
              className="hidden rounded-xl border border-line px-3 py-2 text-ink hover:border-pri sm:inline-flex"
            >
              Vérifier un reçu QR
            </Link>
            <Link
              href="/t/awa-s4"
              className="rounded-xl border border-line px-3 py-2 text-ink hover:border-pri"
            >
              Lien Locataire
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-pri px-3.5 py-2 text-onp shadow-xs"
            >
              Connexion OTP
            </Link>
          </div>
        </div>
      </header>

      {/* Section Hero Landing Page + Application Interactive */}
      <section className="mx-auto max-w-5xl px-4 pt-6">
        <div className="mx-auto max-w-[520px] text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-pri/25 bg-pri/10 px-3.5 py-1 text-xs font-bold text-pri">
            <Sparkles className="h-3.5 w-3.5" />
            Encaissement Mobile Money & Quittances QR au Bénin
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Encaissez vos loyers sans courir après vos locataires.
          </h1>
          <p className="mt-2 text-sm text-mut">
            Le locataire paie en 30 secondes par{" "}
            <strong className="text-ink">MTN MoMo, Moov Money ou Celtiis Cash</strong>{" "}
            sans créer de compte. Chaque paiement génère un{" "}
            <strong className="text-ink">reçu officiel vérifiable par QR Code</strong>{" "}
            envoyé sur WhatsApp.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <Button asChild size="sm">
              <Link href="/onboarding">
                Démarrer en 2 minutes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/t/awa-s4">
                Tester un paiement locataire (35 000 FCFA)
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/verify/REC-2026-000001">
                <QrCode className="h-4 w-4" />
                Vérifier REC-2026-000001
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Application Interactive complète (Propriétaire / Locataire / Biens / Relances) */}
      <section aria-label="Application interactive LoyerClair">
        <InteractiveWorkspace initialTab="own" />
      </section>

      {/* Piliers de valeur & Pied de page légal APDP Bénin */}
      <footer className="border-t border-line bg-card/60 pb-28 pt-10">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <Zap className="h-6 w-6 text-pri" />
              <h3 className="mt-2 font-display text-sm font-extrabold">
                Opérationnel en &lt; 2 min
              </h3>
              <p className="mt-1 text-xs text-mut">
                Zéro mot de passe (OTP 6 chiffres). Ajoutez un bien et un
                locataire : son lien WhatsApp part automatiquement.
              </p>
            </Card>
            <Card className="p-4">
              <Smartphone className="h-6 w-6 text-pri" />
              <h3 className="mt-2 font-display text-sm font-extrabold">
                MTN, Moov & Celtiis Cash
              </h3>
              <p className="mt-1 text-xs text-mut">
                Montant recalculé côté serveur en FCFA sans décimales. Webhooks
                signés HMAC et strictement idempotents.
              </p>
            </Card>
            <Card className="p-4">
              <ShieldCheck className="h-6 w-6 text-pri" />
              <h3 className="mt-2 font-display text-sm font-extrabold">
                Reçu officiel QR & PDF
              </h3>
              <p className="mt-1 text-xs text-mut">
                Numérotation séquentielle REC-2026-XXXXXX et vérification
                publique instantanée pour éviter tout litige.
              </p>
            </Card>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-xs text-mut">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-ok" />
              <span>
                © 2026 LoyerClair Bénin · Cotonou · Conforme APDP (Code du
                Numérique)
              </span>
            </div>
            <div className="flex flex-wrap gap-4 font-semibold">
              <Link href="/dashboard" className="hover:text-pri">
                Dashboard
              </Link>
              <Link href="/onboarding" className="hover:text-pri">
                Onboarding
              </Link>
              <Link href="/login" className="hover:text-pri">
                Connexion OTP
              </Link>
              <Link href="/verify/REC-2026-000001" className="hover:text-pri">
                Vérifier un reçu
              </Link>
              <Link href="/cgu" className="hover:text-pri">
                CGU
              </Link>
              <Link href="/confidentialite" className="hover:text-pri">
                Confidentialité (APDP)
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
