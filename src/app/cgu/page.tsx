import React from "react";
import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/loyerclair/theme-toggle";

export default function CguPage() {
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
          <Scale className="h-3.5 w-3.5" />
          Conditions Générales d’Utilisation — République du Bénin
        </div>
        <h1 className="font-display text-2xl font-extrabold">
          Conditions Générales d’Utilisation (CGU)
        </h1>
        <p className="text-xs text-mut">
          Dernière mise à jour : 26 octobre 2026 · Applicable en République du Bénin
        </p>

        <section>
          <h2 className="font-display text-base font-bold">
            1. Objet du service LoyerClair
          </h2>
          <p className="mt-1 text-mut">
            LoyerClair est une plateforme logicielle (SaaS) permettant aux
            propriétaires immobiliers et gestionnaires au Bénin de suivre leurs
            loyers, d’envoyer des avis d’échéance par WhatsApp/SMS, d’encaisser
            les règlements par Mobile Money (MTN MoMo, Moov Money, Celtiis Cash)
            via un agrégateur agréé (FedaPay), et d’émettre automatiquement des
            quittances électroniques vérifiables par QR Code.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">
            2. Intermédiation de paiement et sécurité financière
          </h2>
          <p className="mt-1 text-mut">
            Les flux financiers Mobile Money sont traités par FedaPay en
            partenariat avec les émetteurs de monnaie électronique agréés dans
            l’espace UEMOA / BCEAO. LoyerClair ne stocke jamais de code PIN
            Mobile Money. Le montant appelé est systématiquement calculé côté
            serveur à partir du bail enregistré par le propriétaire.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">
            3. Valeur probante des reçus QR
          </h2>
          <p className="mt-1 text-mut">
            Conformément au Code du Numérique en République du Bénin (Loi n°
            2017-20), chaque reçu généré porte un numéro séquentiel unique
            (REC-AAAA-NNNNNN) ainsi qu’une empreinte cryptographique vérifiable
            publiquement via son QR Code.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">
            4. Droit applicable et juridiction
          </h2>
          <p className="mt-1 text-mut">
            Les présentes CGU sont régies par le droit béninois. Tout différend
            relatif à leur interprétation ou exécution relève de la compétence
            des juridictions de Cotonou (République du Bénin).
          </p>
        </section>
      </Card>
    </main>
  );
}
