# LoyerClair — instructions pour l'agent IA (lis aussi HANDOFF.md)

SaaS de collecte de loyers par Mobile Money au Bénin : le propriétaire encaisse, chaque paiement génère un reçu officiel vérifiable (QR), envoyé par WhatsApp/SMS.

## Règles non négociables
1. Simplicité extrême : un écran = une action. Propriétaire opérationnel < 2 min, locataire paie < 30 s sans créer de compte.
2. Mobile first (Android entrée de gamme, 3G). PWA. Cibles tactiles ≥ 48 px.
3. Zéro mot de passe : téléphone + OTP 6 chiffres.
4. Français simple. Montants en FCFA sans décimales ("50 000 FCFA"). i18n prête.
5. Argent : le montant est TOUJOURS recalculé côté serveur. Webhooks : signature vérifiée + idempotence (déjà dans `confirm_payment`). Ne jamais stocker de PIN ni de secret côté client.
6. RLS strict (voir migration). Aucune clé service_role côté navigateur.
7. Pas de TODO vagues : code complet, typé (TypeScript strict), testé.

## Stack
Next.js 14+ App Router, TypeScript, Tailwind, shadcn/ui, Framer Motion, react-hook-form + Zod, TanStack Query, Recharts, Supabase (Postgres, Auth, Storage, RLS), Vitest, Playwright. Déploiement Vercel + Supabase.

## Design (référence visuelle : design/loyerclair-demo.html — à reproduire et améliorer)
Palette : émeraude #0B6B4F, accent or #F5B83D, fond #FAFAF7, encre #0F1A17, mode sombre complet. Polices : Plus Jakarta Sans (titres) + Inter. Coins 16–24 px, ombres douces, glassmorphism léger.
Animations (Framer Motion, respecter prefers-reduced-motion) : transitions de page, stagger des listes, count-up des montants, anneau de recouvrement, coche SVG animée + confettis au succès, skeletons partout.

## Critères d'acceptation
- Un paiement réussi crée exactement 1 reçu, même si le webhook est rejoué.
- Un propriétaire ne peut jamais lire les données d'un autre (test automatisé).
- `npm install && npm run dev` démarre en mode démo sans aucune clé externe (providers mock).
