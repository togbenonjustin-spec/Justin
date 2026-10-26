import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/loyerclair/theme-toggle";

export default function ConfidentialitePage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[680px] px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card text-ink"
          aria-label="Accueil"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="font-display text-xl font-extrabold">
          Loyer<span className="text-acc">Clair</span>
        </div>
        <ThemeToggle />
      </div>

      <Card className="space-y-4 p-6 text-sm leading-relaxed">
        <div className="inline-flex items-center gap-2 rounded-full bg-pri/10 px-3 py-1 text-xs font-bold text-pri">
          <Shield className="h-3.5 w-3.5" />
          Conformité APDP Bénin — Livre V du Code du Numérique
        </div>
        <h1 className="font-display text-2xl font-extrabold">
          Politique de Confidentialité & Protection des Données (APDP)
        </h1>
        <p className="text-xs text-mut">
          Conforme à la Loi n° 2017-20 portant Code du Numérique en République
          du Bénin sous le contrôle de l’Autorité de Protection des Données
          Personnelles (APDP).
        </p>

        <section>
          <h2 className="font-display text-base font-bold">
            1. Données collectées (Minimisation)
          </h2>
          <p className="mt-1 text-mut">
            LoyerClair applique le principe de minimisation des données : seuls
            le nom complet, le numéro de téléphone (+229), le libellé du
            logement, le montant du loyer en FCFA et l’historique des quittances
            sont collectés aux fins exclusives de gestion locative et d’émission
            de reçus officiels.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">
            2. Cloisonnement strict (Row Level Security)
          </h2>
          <p className="mt-1 text-mut">
            Les données de chaque propriétaire sont isolées au niveau de la base
            de données par des politiques Row Level Security (RLS) PostgreSQL.
            Aucun propriétaire ne peut consulter ou modifier les locataires ou
            reçus d’un autre propriétaire.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">
            3. Droit d’opposition aux relances (Opt-out) & Droits APDP
          </h2>
          <p className="mt-1 text-mut">
            Chaque locataire peut désactiver à tout moment les rappels
            automatiques WhatsApp/SMS directement depuis son lien personnel{" "}
            <code>/t/[token]</code>. Vous disposez d’un droit d’accès, de
            rectification, de portabilité et d’effacement de vos données auprès
            de notre délégué à la protection des données :{" "}
            <strong>dpo@loyerclair.bj</strong>.
          </p>
        </section>
      </Card>
    </main>
  );
}
