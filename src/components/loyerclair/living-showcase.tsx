"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock,
  FileCheck2,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { TypewriterLoop } from "./typewriter-loop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const LIVE_TICKER_ITEMS = [
  {
    icon: "🟡",
    tenant: "Koffi Adjovi",
    unit: "Appt 2A · Cotonou",
    amount: "50 000 FCFA",
    op: "MTN MoMo",
    badge: "Reçu REC-2026-000001 vérifié ✓",
  },
  {
    icon: "🔵",
    tenant: "Fatou Dossou",
    unit: "Villa 7 · Haie Vive",
    amount: "80 000 FCFA",
    op: "Moov Money",
    badge: "Reçu REC-2026-000002 vérifié ✓",
  },
  {
    icon: "🟣",
    tenant: "Sènan Agbossou",
    unit: "Appt B1 · Calavi",
    amount: "60 000 FCFA",
    op: "Celtiis Cash",
    badge: "Quittance QR envoyée sur WhatsApp ✓",
  },
  {
    icon: "🟡",
    tenant: "Mireille Zinsou",
    unit: "Studio 3C · Porto-Novo",
    amount: "45 000 FCFA",
    op: "MTN MoMo",
    badge: "Confirmé en 1,4 s via USSD ✓",
  },
  {
    icon: "💵",
    tenant: "Codjo Mensah",
    unit: "Studio 5 · Akpakpa",
    amount: "40 000 FCFA",
    op: "Espèces",
    badge: "Quittance Cash QR émise ✓",
  },
  {
    icon: "💬",
    tenant: "Jean Houngbo",
    unit: "Appt 1B · Cotonou",
    amount: "45 000 FCFA",
    op: "Rappel J-3",
    badge: "Lien /t/jean-1b envoyé sur WhatsApp ✓",
  },
];

export function LivingHeroSection() {
  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden px-4 pt-7 pb-4">
      {/* Orbes lumineux d'arrière-plan en mouvement perpétuel */}
      <div
        aria-hidden="true"
        className="animate-float-orb pointer-events-none absolute -left-16 top-2 h-56 w-56 rounded-full bg-pri/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="animate-float-orb-delayed pointer-events-none absolute -right-16 top-10 h-60 w-60 rounded-full bg-acc/20 blur-3xl"
      />

      {/* Badges flottants vivants sur les côtés (Desktop) */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0, y: [0, -7, 0] }}
        transition={{
          opacity: { duration: 0.5 },
          y: { duration: 4.2, repeat: Infinity, ease: "easeInOut" },
        }}
        className="pointer-events-none absolute left-3 top-12 hidden items-center gap-2.5 rounded-2xl border border-line bg-card/90 px-3.5 py-2.5 text-xs shadow-card backdrop-blur-md lg:flex"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ok/15 text-base">
          🟡
        </span>
        <div>
          <div className="font-extrabold text-ok">+50 000 FCFA reçu</div>
          <div className="text-[11px] text-mut">Koffi A. · MTN MoMo · Appt 2A</div>
        </div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0, y: [0, 7, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 0.2 },
          y: { duration: 4.8, repeat: Infinity, ease: "easeInOut" },
        }}
        className="pointer-events-none absolute right-3 top-16 hidden items-center gap-2.5 rounded-2xl border border-line bg-card/90 px-3.5 py-2.5 text-xs shadow-card backdrop-blur-md lg:flex"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pri/15 text-base">
          🧾
        </span>
        <div>
          <div className="font-mono font-extrabold text-pri">
            REC-2026-000001
          </div>
          <div className="text-[11px] text-mut">
            QR Code envoyé sur WhatsApp ✓
          </div>
        </div>
      </motion.div>

      <div className="relative mx-auto max-w-[600px] text-center">
        {/* Badge supérieur pulsé */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-pri/30 bg-pri/10 px-4 py-1.5 text-xs font-bold text-pri shadow-xs"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pri opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pri" />
          </span>
          <Sparkles className="h-3.5 w-3.5" />
          Encaissement Mobile Money & Quittances QR au Bénin
        </motion.div>

        {/* TITRE PRINCIPAL : Animation lettre par lettre (Apparition -> Pause -> Disparition -> Apparition) */}
        <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl md:text-[42px]">
          <TypewriterLoop
            typeSpeedMs={42}
            deleteSpeedMs={22}
            holdCompleteMs={2800}
            holdEmptyMs={450}
            cursorClassName="text-acc"
            segments={[
              { text: "Encaissez vos loyers " },
              {
                text: "sans courir après vos locataires.",
                className: "text-gradient-emerald",
              },
            ]}
          />
        </h1>

        {/* SOUS-TITRE LOCATAIRE : Même modèle lettre par lettre (Apparition -> Pause -> Disparition -> Apparition) */}
        <p className="mt-3 text-sm leading-relaxed text-mut sm:text-base">
          <TypewriterLoop
            typeSpeedMs={24}
            deleteSpeedMs={12}
            holdCompleteMs={3400}
            holdEmptyMs={500}
            initialDelayMs={350}
            cursorClassName="text-pri"
            segments={[
              { text: "Le locataire paie en 30 secondes par " },
              {
                text: "MTN MoMo, Moov Money ou Celtiis Cash",
                className: "font-bold text-ink",
              },
              {
                text: " sans créer de compte. Chaque paiement génère un ",
              },
              {
                text: "reçu officiel vérifiable par QR Code",
                className: "font-bold text-pri",
              },
              { text: " envoyé sur WhatsApp." },
            ]}
          />
        </p>

        {/* Boutons d'action avec rebond fluide */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-2.5"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button asChild size="sm" className="shadow-soft">
              <Link href="/onboarding">
                Démarrer en 2 minutes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button asChild size="sm" variant="outline">
              <Link href="/t/awa-s4">
                Tester un paiement locataire (35 000 FCFA)
              </Link>
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button asChild size="sm" variant="ghost">
              <Link href="/verify/REC-2026-000001">
                <QrCode className="h-4 w-4 text-pri" />
                Vérifier REC-2026-000001
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Bandeau de défilement continu (Marquee) des encaissements et reçus QR au Bénin
 */
export function LiveActivityMarquee() {
  const doubled = [...LIVE_TICKER_ITEMS, ...LIVE_TICKER_ITEMS];

  return (
    <div
      aria-label="Flux en direct des encaissements Mobile Money au Bénin"
      className="my-5 overflow-hidden border-y border-line bg-card/70 py-2.5 backdrop-blur-sm"
    >
      <div className="animate-marquee flex items-center gap-3.5 px-4">
        {doubled.map((item, idx) => (
          <div
            key={idx}
            className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-line bg-bg/90 px-3.5 py-2 text-xs shadow-xs transition hover:border-pri"
          >
            <span className="text-base">{item.icon}</span>
            <span className="font-bold text-ink">{item.tenant}</span>
            <span className="text-mut">({item.unit})</span>
            <span className="rounded-lg bg-ok/15 px-2 py-0.5 font-mono font-extrabold text-ok">
              {item.amount}
            </span>
            <span className="text-[11px] font-semibold text-pri">
              {item.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Sections animées au défilement (Scroll Reveal) :
 * - Comment ça marche en 3 étapes
 * - Opérateurs Mobile Money Bénin
 * - Comparatif Avant / Avec LoyerClair
 */
export function LivingScrollSections() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-10">
      {/* SECTION 1 : Comment ça marche en 3 étapes animées */}
      <motion.section
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pri/10 px-3 py-1 text-xs font-bold text-pri">
            <Clock className="h-3.5 w-3.5" />1 écran = 1 action · Zéro friction
          </span>
          <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
            Comment LoyerClair automatise vos loyers
          </h2>
          <p className="mt-1 text-sm text-mut">
            Pensé pour les propriétaires, agences et locataires à Cotonou,
            Calavi, Porto-Novo et Parakou.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              icon: Zap,
              title: "Ajoutez votre bien en 2 min",
              desc: "Renseignez votre numéro Mobile Money de reversement, votre immeuble et vos locataires (ou importez un fichier CSV).",
              pill: "Propriétaire opérationnel < 2 min",
            },
            {
              step: "02",
              icon: Smartphone,
              title: "Le locataire paie en 30 secondes",
              desc: "Il clique sur son lien WhatsApp /t/[token], choisit MTN MoMo, Moov Money ou Celtiis Cash et valide son code PIN USSD.",
              pill: "Aucun compte ni mot de passe requis",
            },
            {
              step: "03",
              icon: FileCheck2,
              title: "Quittance QR officielle immédiate",
              desc: "Dès confirmation du webhook signé, le reçu PDF numéroté REC-2026-XXXXXX avec QR Code est envoyé sur WhatsApp.",
              pill: "1 paiement = 1 reçu infalsifiable",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: idx * 0.12 }}
                whileHover={{ y: -5 }}
              >
                <Card className="relative h-full overflow-hidden p-5 transition hover:border-pri">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-pri/15 text-pri">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-2xl font-extrabold text-pri/25">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-3.5 font-display text-base font-extrabold">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-mut">
                    {item.desc}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-ok/10 px-2.5 py-1 text-[11px] font-bold text-ok">
                    <CheckCircle2 className="h-3 w-3" />
                    {item.pill}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* SECTION 2 : Les 3 Opérateurs Mobile Money du Bénin + Espèces */}
      <motion.section
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-pri/25 bg-gradient-to-br from-card via-card to-pri/5 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-acc/20 px-3 py-1 text-xs font-extrabold text-ink">
                🇧🇯 100 % adapté au Bénin · FCFA sans décimales
              </span>
              <h2 className="mt-2 font-display text-xl font-extrabold sm:text-2xl">
                Tous les moyens de paiement de vos locataires réunis
              </h2>
              <p className="mt-1 text-xs text-mut sm:text-sm">
                Montant toujours recalculé côté serveur. Webhook signé
                HMAC-SHA256 et réconciliation automatique.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/t/awa-s4">
                Simuler un paiement Mobile Money
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              {
                emoji: "🟡",
                name: "MTN MoMo",
                sub: "Préfixes 97, 96, 61, 62, 66, 67…",
                speed: "Confirmation USSD ~2s",
              },
              {
                emoji: "🔵",
                name: "Moov Money",
                sub: "Préfixes 99, 98, 95, 94, 64, 65…",
                speed: "Confirmation USSD ~2s",
              },
              {
                emoji: "🟣",
                name: "Celtiis Cash",
                sub: "Préfixes SBIN 40, 41, 42, 43, 44…",
                speed: "Confirmation USSD ~2s",
              },
              {
                emoji: "💵",
                name: "Espèces (Cash)",
                sub: "Validation 1 clic par le bailleur",
                speed: "0 FCFA de commission",
              },
            ].map((op, i) => (
              <motion.div
                key={op.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-line bg-bg p-4 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{op.emoji}</span>
                  <div>
                    <div className="font-display text-sm font-extrabold">
                      {op.name}
                    </div>
                    <div className="text-[11px] text-mut">{op.sub}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-ok">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {op.speed}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.section>

      {/* SECTION 3 : Avant LoyerClair vs Avec LoyerClair */}
      <motion.section
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Card className="border-bad/25 bg-bad/5 p-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-bad/15 px-3 py-1 text-xs font-extrabold text-bad">
            <XCircle className="h-3.5 w-3.5" />
            Avant LoyerClair (Gestion traditionnelle)
          </div>
          <ul className="mt-4 space-y-2.5 text-xs text-ink sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-bad">✕</span>
              Déplacements répétés à Cotonou et appels incessants pour réclamer
              le loyer.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-bad">✕</span>
              Carnets de reçus papier perdus, falsifiables ou illisibles en cas
              de litige.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-bad">✕</span>
              Captures d’écran Mobile Money difficiles à rapprocher en fin de
              mois.
            </li>
          </ul>
        </Card>

        <Card className="border-ok/30 bg-ok/5 p-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-3 py-1 text-xs font-extrabold text-ok">
            <TrendingUp className="h-3.5 w-3.5" />
            Avec LoyerClair (Automatisation Mobile Money + QR)
          </div>
          <ul className="mt-4 space-y-2.5 text-xs text-ink sm:text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-ok">✓</span>
              Relances automatiques bienveillantes sur WhatsApp (J-3, Jour J,
              J+1, J+3, J+7).
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-ok">✓</span>
              Quittance PDF officielle numérotée avec QR Code vérifiable sur
              /verify/[code].
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-ok">✓</span>
              Tableau de bord temps réel, graphique sur 6 mois et export CSV
              comptable en 1 clic.
            </li>
          </ul>
        </Card>
      </motion.section>
    </div>
  );
}
