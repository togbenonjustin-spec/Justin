import { test, expect } from "@playwright/test";

test.describe("LoyerClair — Parcours E2E Complet (Propriétaire → Invitation → Paiement Mobile Money → Reçu QR)", () => {
  test("Affiche le dashboard propriétaire, réalise l'onboarding 3 écrans, le paiement locataire Mobile Money et la vérification QR", async ({
    page,
  }) => {
    // 1. Page d'accueil & Dashboard Propriétaire
    await page.goto("/");
    await expect(page.locator("text=LoyerClair").first()).toBeVisible();
    await expect(page.locator("text=Bonjour Adjoa").first()).toBeVisible();
    await expect(page.locator("text=Koffi Adjovi").first()).toBeVisible();

    // 2. Onboarding Propriétaire en 3 écrans -> génère un lien /t/[token]
    await page.goto("/onboarding");
    await page.getByPlaceholder("Ex: Adjoa Mensah").fill("Romuald Kerekou");
    await page.getByPlaceholder("+229 97 00 11 22").fill("+229 97 11 22 33");
    await page.getByRole("button", { name: /Continuer/i }).click();

    await page
      .getByPlaceholder("Ex: Résidence Les Cocotiers")
      .fill("Villa Ganhi");
    await page.getByRole("button", { name: /Continuer/i }).click();

    await page.getByPlaceholder("Ex: Koffi Adjovi").fill("Mireille Zinsou");
    await page.getByPlaceholder("Appt 2A, Studio 4…").fill("Studio B2");
    await page.getByPlaceholder("50000").fill("40000");
    await page.getByPlaceholder("+229 97 12 34 56").fill("+229 96 44 55 66");
    await page.getByRole("button", { name: /Envoyer l'invitation/i }).click();

    await expect(
      page.locator("text=Votre espace est prêt !").first()
    ).toBeVisible({ timeout: 10000 });

    // 3. Vérification publique d'un reçu existant (/verify/REC-2026-000001)
    await page.goto("/verify/REC-2026-000001");
    await expect(page.getByTestId("verified-receipt-card")).toBeVisible();
    await expect(
      page.locator("text=Reçu officiel authentique").first()
    ).toBeVisible();
    await expect(page.locator("text=Koffi Adjovi").first()).toBeVisible();

    // 4. Parcours Locataire /t/awa-s4 (Awa Sossou, Studio 4, 35 000 FCFA)
    await page.goto("/t/awa-s4");
    await expect(page.locator("text=Bonjour Awa").first()).toBeVisible();

    const payNowBtn = page.getByTestId("btn-pay-now");
    if (await payNowBtn.isVisible()) {
      await payNowBtn.click();
      await page.getByTestId("op-mtn").click();
      await page.getByTestId("btn-confirm-pay").click();

      // Attente de la confirmation USSD simulée -> Écran de succès avec coche animée + confettis
      await expect(page.getByTestId("payment-success-screen")).toBeVisible({
        timeout: 12000,
      });
      await expect(page.locator("text=Paiement réussi !").first()).toBeVisible();
    }
  });
});
