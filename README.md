# LoyerClair 🇧🇯

> **SaaS de collecte de loyers par Mobile Money (MTN MoMo, Moov Money, Celtiis Cash) au Bénin avec émission automatique de reçus officiels vérifiables par QR Code sur WhatsApp & SMS.**

---

## ✨ Fonctionnalités Clés

- **Propriétaire opérationnel en moins de 2 minutes** : Onboarding en 3 écrans (Profil Mobile Money → Bien immobilier → Premier locataire).
- **Paiement Locataire en moins de 30 secondes (`/t/[token]`)** : Zéro création de compte, choix d'opérateur (**MTN MoMo**, **Moov Money**, **Celtiis Cash**), validation USSD temps réel, coche SVG animée + confettis.
- **Reçu Officiel PDF + QR Code Infalsifiable (`/verify/[code]`)** : Numérotation séquentielle atomique (`REC-2026-XXXXXX`), code de contrôle (`LC-XXXXXXXXXX`), téléchargement PDF A5 et page publique de vérification.
- **Sécurité & Idempotence Bancaire** :
  - Montants et commissions toujours recalculés côté serveur (`src/lib/payments/fees.ts`).
  - Vérification cryptographique HMAC-SHA256 en temps constant (`X-FEDAPAY-SIGNATURE`).
  - Idempotence SQL stricte (`confirm_payment` avec `FOR UPDATE`) : **1 paiement = 1 seul reçu** même si le webhook est rejoué.
  - Isolation multi-propriétaires par **Row-Level Security (RLS)** testée automatiquement entre deux bailleurs.
- **Relances Automatisées & Comptabilité** : Rappels WhatsApp/SMS programmables (`J-3`, `J`, `J+1`, `J+3`, `J+7`) avec opt-out locataire, encaissement espèces en 1 clic, graphique sur 6 mois et export CSV comptable (`UTF-8 BOM`).
- **Mobile-First & PWA** : Conçu pour les smartphones Android d'entrée de gamme et les connexions 3G au Bénin, installable sur l'écran d'accueil, avec mode Clair / Sombre.

---

## 🚀 Démarrage Rapide (Mode Démo immédiat sans clés externes)

```bash
npm install
npm run dev
```

Ouvrez `http://localhost:3000` :
- `/` : Landing page + Espace interactif Propriétaire / Locataire
- `/dashboard` : Tableau de bord Propriétaire
- `/onboarding` : Création d'un compte bailleur en 3 écrans
- `/login` : Connexion par téléphone + code OTP à 6 chiffres
- `/t/awa-s4` ou `/t/jean-1b` : Portail de paiement locataire Mobile Money
- `/verify/REC-2026-000001` : Vérification publique d'un reçu officiel par QR Code

---

## 🧪 Tests Automatisés

```bash
npm test          # 14 tests Vitest (FCFA, FedaPay HMAC, OTP, PDF, Idempotence & RLS Supabase)
npm run test:e2e  # Test E2E Playwright (Mobile Chrome)
npm run typecheck # Vérification TypeScript stricte
npm run build     # Build de production Next.js
```
