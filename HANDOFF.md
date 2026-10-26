# HANDOFF.md — LoyerClair (État d'avancement & Documentation Technique)

> **Dernière mise à jour :** 26 octobre 2026
> **Statut global :** ✅ **ÉTAPE 0, ÉTAPE 1 et P3 → P11 complétées, compilées et testées (Vitest 14/14 + Playwright E2E Mobile Chrome 1/1).**

---

## 1. Ce qui est livré & opérationnel

### ÉTAPE 1 — Setup, Base de données Supabase & Fondations
- [x] **Next.js 14.2 (App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Framer Motion, TanStack Query, Recharts)** initialisé à la racine.
- [x] **Migration SQL (`supabase/migrations/001_loyerclair_schema.sql`) appliquée sur Supabase (`fghlgxnzcdfqbbttrqeq`)** :
  - 10 tables (`profiles`, `organizations`, `properties`, `units`, `tenants`, `rent_periods`, `payments`, `receipts`, `reminders`, `audit_logs`) + séquence atomique `receipt_seq` + bucket Storage `receipts`.
  - **15 politiques RLS** garantissant l'isolation stricte entre propriétaires (`owner_id = auth.uid()`) et l'accès locataire.
  - **Fonctions RPC transactionnelles (`SECURITY DEFINER`)** :
    - `confirm_payment(p_payment_id, p_provider_tx_id, p_raw_webhook)` : verrouillage `FOR UPDATE`, idempotence stricte (1 paiement = 1 seul reçu `REC-YYYY-NNNNNN` même si le webhook est rejoué), mise à jour de `rent_periods` et écriture dans `audit_logs`.
    - `record_cash_payment(p_rent_period_id, p_amount, p_note)` : encaissement espèces par le bailleur + émission immédiate du reçu officiel.
    - `claim_invite(p_token, p_user_id)` : liaison sécurisée d'un locataire via son lien `/t/[token]`.
    - `generate_rent_periods(p_period_month)` & `mark_late_periods(p_today)` : génération mensuelle et marquage quotidien des retards.
    - `verify_receipt(p_code)` : vérification publique sans authentification par numéro (`REC-2026-000001`) ou code (`LC-586DDBAAD8`).
- [x] **Jeu de données de démonstration (`supabase/seed.sql`)** :
  - Bailleur principal **Adjoa Mensah** (`Résidence Les Cocotiers`, Cotonou) avec 4 locataires :
    1. **Koffi Adjovi** (`Appt 2A`, `50 000 FCFA`, token `koffi-2a`) — Payé via MTN MoMo (`REC-2026-000001`, code `LC-586DDBAAD8`)
    2. **Awa Sossou** (`Studio 4`, `35 000 FCFA`, token `awa-s4`) — En retard (`late`)
    3. **Jean Houngbo** (`Appt 1B`, `45 000 FCFA`, token `jean-1b`) — En attente (`pending`)
    4. **Fatou Dossou** (`Villa 7`, `80 000 FCFA`, token `fatou-v7`) — Payé via Moov Money (`REC-2026-000002`, code `LC-AE2DAF7C3D`)
  - Second bailleur **Bruno Soglo** (`Immeuble Ganhi`, locataire **Sènan Agbossou**, token `senan-b1`) utilisé par le test automatisé d'isolation RLS.
- [x] **Démarrage immédiat sans clés externes (`MOCK_PROVIDERS=true`)** : fonctionne avec Supabase connecté ou en repli mémoire si aucune clé n'est fournie.

---

### ÉTAPE 2 — Fonctionnalités P3 à P11

- [x] **P3 — Auth OTP Téléphone (`/login`, `/api/auth/otp`, `/api/auth/sms-hook`)**
  - Saisie téléphone Bénin (`+229`) + 6 cases OTP avec auto-focus, support du collage (paste), compte à rebours 30s avant renvoi, rate-limiting par numéro, réponses génériques anti-énumération, et création automatique du `profile` au premier login.
  - Webhook Supabase Send SMS Hook (`/api/auth/sms-hook`) compatible WhatsApp Cloud API / SMS Bénin (sans dépendance à Twilio).
- [x] **P3 — Onboarding Propriétaire en 3 écrans max (`/onboarding`, `/api/onboarding`)**
  - Écran 1 : Nom + numéro Mobile Money de reversement (MTN / Moov / Celtiis).
  - Écran 2 : Nom du bien immobilier + ville/quartier.
  - Écran 3 : Premier locataire + logement + loyer mensuel FCFA -> crée `organizations`, `properties`, `units`, `tenants`, `rent_periods` et envoie le lien `/t/[token]` sur WhatsApp.
- [x] **P4 — Gestion Immobilière & Crons (`/api/properties`, `/api/tenants`, `/api/cron/*`, `vercel.json`)**
  - Ajout de biens, ajout unitaire de locataires et **import CSV en lot** (`Nom;Téléphone;Logement;Loyer;JourÉchéance`).
  - Cron mensuel `/api/cron/generate-periods` (`generate_rent_periods`) et cron quotidien `/api/cron/mark-late` (`mark_late_periods`) protégés par `Authorization: Bearer ${CRON_SECRET}`.
- [x] **P5 — Parcours Locataire `/t/[token]` (`/t/[token]`, `/api/invite/[token]`, `/api/payments`)**
  - Fidèle au prototype `design/loyerclair-demo.html` : carte de loyer émeraude/or, sélection opérateur (**MTN MoMo**, **Moov Money**, **Celtiis Cash**), validation optionnelle par OTP (`claim_invite`), écran d'attente USSD pulsé avec polling temps réel, écran de succès avec **coche SVG animée + confettis**, et ouverture/téléchargement du reçu QR.
- [x] **P6 — Adaptateur FedaPay, Webhook & Réconciliation (`src/lib/providers/fedapay.ts`, `/api/webhooks/fedapay`, `/api/cron/reconcile-payments`)**
  - Calcul systématique du montant et des frais (`1,8 %` Mobile Money Bénin) côté serveur (`src/lib/payments/fees.ts`).
  - Vérification cryptographique `X-FEDAPAY-SIGNATURE` (`t=<timestamp>,s=<hmac_sha256>`) en temps constant (`crypto.timingSafeEqual`) sur le corps brut.
  - Idempotence testée (rejeu multiple du webhook = 1 seul reçu).
  - Cron `/api/cron/reconcile-payments` interrogeant `getStatus` pour les paiements `pending` > 10 minutes.
- [x] **P7 — Reçus Officiels PDF + QR Code + Vérification Publique (`src/lib/receipts/pdf.ts`, `/api/receipts/[code]/pdf`, `/verify/[code]`)**
  - Génération PDF A5 (`pdf-lib` + `qrcode`) incluant numéro séquentiel `REC-2026-XXXXXX`, code `LC-XXXXXXXXXX`, détail bailleur/locataire/opérateur et QR Code pointant vers `/verify/[code]`.
  - Sauvegarde automatique dans Supabase Storage (`receipts`) + mise à jour de `receipts.pdf_url` + envoi WhatsApp/SMS au locataire et au propriétaire.
  - Page publique `/verify/[code]` affichant l'authenticité du reçu sans connexion.
- [x] **P8 — Dashboards Propriétaire & Locataire (`/dashboard`, `src/components/loyerclair/interactive-workspace.tsx`, `/api/export/csv`)**
  - Montants animés (`AnimatedAmount`), anneau SVG de recouvrement (`RecoveryRing`), filtre par statut (`Tous`, `À relancer`, `Payés`), encaissement espèces en 1 clic, graphique d'historique sur 6 mois, et export CSV comptable (`UTF-8 BOM`).
- [x] **P9 — Relances Automatisées & Opt-out (`/api/reminders`)**
  - Programmation `J-3`, `J`, `J+1`, `J+3`, `J+7` avec modèles en français personnalisables, récapitulatif hebdomadaire bailleur, et bouton d'opt-out locataire sur `/t/[token]`.
- [x] **P10 — Landing Page, PWA & Dark Mode (`/`, `/offline`, `public/manifest.json`, `public/sw.js`)**
  - Landing page complète avec démonstration interactive Propriétaire/Locataire embarquée, bascule Clair/Sombre persistante, manifest PWA installable, Service Worker et page hors-ligne `/offline`.
- [x] **P11 — Qualité, Sécurité & Conformité APDP Bénin (`tests/payments.test.ts`, `e2e/loyerclair.spec.ts`, `/cgu`, `/confidentialite`, `next.config.mjs`)**
  - En-têtes de sécurité HTTP (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).
  - Pages légales `/cgu` et `/confidentialite` conformes à la Loi n° 2017-20 (Code du numérique en République du Bénin / APDP).
  - 14 tests unitaires & d'intégration Vitest (incluant idempotence live Supabase et isolation RLS entre deux propriétaires) + test E2E Playwright Mobile Chrome.

---

## 2. Points à faire valider par un humain avant mise en production ⚠️

1. **Validation Sandbox & Production FedaPay (`src/lib/providers/fedapay.ts`)** :
   - Vérifier avec vos clés `FEDAPAY_SECRET_KEY` (`sk_sandbox_...` puis `sk_live_...`) et `FEDAPAY_WEBHOOK_SECRET` dans le tableau de bord FedaPay l'activation effective des 3 canaux **MTN MoMo Bénin (`mtn_open`)**, **Moov Money Bénin (`moov`)** et **Celtiis Cash Bénin (`celtiis`)** sur votre compte marchand.
   - Valider la grille tarifaire exacte négociée sur votre contrat marchand FedaPay (configurée par défaut au tarif public Bénin de **1,8 %** par encaissement Mobile Money et paliers de reversement de 150 à 2 500 FCFA).
2. **Fournisseur WhatsApp Cloud API / SMS Bénin (`/api/auth/sms-hook` & `src/lib/providers/notifications.ts`)** :
   - Renseigner `WHATSAPP_ACCESS_TOKEN` et `WHATSAPP_PHONE_NUMBER_ID` (Meta Cloud API) et valider les templates WhatsApp transactionnels (OTP, invitation `/t/[token]`, reçu de loyer, relance).
3. **Statut réglementaire & Juridique (Bénin / UMOA)** :
   - Faire valider par un conseil juridique au Bénin les `/cgu` (mandat d'encaissement pour compte de tiers via établissement de paiement agréé BCEAO) et la déclaration de traitement auprès de l'**APDP Bénin**.

---

## 3. Commandes utiles

```bash
npm install          # Installer les dépendances
npm run dev          # Lancer le serveur de développement (0.0.0.0:3000)
npm test             # Lancer les 14 tests Vitest (unitaires + Supabase RLS & idempotence)
npm run test:e2e     # Lancer le test E2E Playwright Mobile Chrome
npm run typecheck    # Vérifier le typage TypeScript strict
npm run build        # Compiler pour la production
```
