import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { verifyPublicReceipt } from "@/lib/data/loyerclair";
import { formatFCFA } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeterministicQrSvg } from "@/components/loyerclair/receipt-modal";
import { ThemeToggle } from "@/components/loyerclair/theme-toggle";

export const dynamic = "force-dynamic";

export default async function VerifyReceiptPage({
  params,
}: {
  params: { code: string };
}) {
  const code = decodeURIComponent(params.code);
  const result = await verifyPublicReceipt(code);

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-4 py-6">
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

      {result.valid ? (
        <Card className="p-6" data-testid="verified-receipt-card">
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-ok/15 p-3.5 text-ok">
            <ShieldCheck className="h-7 w-7 shrink-0" />
            <div>
              <div className="text-sm font-extrabold">
                Reçu officiel authentique ✅
              </div>
              <div className="text-xs opacity-90">
                Signature et numéro vérifiés dans le registre LoyerClair Bénin
              </div>
            </div>
          </div>

          <div className="relative rounded-[20px] border-2 border-dashed border-line bg-bg p-5">
            <span className="absolute right-4 top-4 rotate-[8deg] rounded-lg border-2 border-ok px-2.5 py-0.5 text-xs font-extrabold text-ok">
              PAYÉ
            </span>

            <div className="text-xs font-semibold text-mut">Numéro officiel</div>
            <h1 className="font-mono text-2xl font-extrabold text-ink">
              {result.receipt_no}
            </h1>

            <div className="mt-4 divide-y divide-line text-sm">
              <div className="flex justify-between py-2.5">
                <span className="text-mut">Locataire</span>
                <span className="font-bold">{result.tenant_name}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-mut">Bien immobilier</span>
                <span className="font-bold">{result.property_name}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-mut">Logement</span>
                <span className="font-bold">{result.unit_label}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-mut">Bailleur</span>
                <span className="font-bold">{result.landlord_name}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-mut">Période acquittée</span>
                <span className="font-bold">{result.period_label}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-mut">Mode de paiement</span>
                <span className="font-bold">{result.operator_label}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-mut">Code d’intégrité</span>
                <span className="font-mono font-bold">
                  {result.verification_code}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-mut">Date d’émission</span>
                <span className="font-bold">
                  {result.issued_at
                    ? new Date(result.issued_at).toLocaleString("fr-FR", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 text-lg">
                <span className="font-semibold text-mut">Montant payé</span>
                <span className="font-extrabold text-ok">
                  {formatFCFA(Number(result.amount || 0))}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl bg-card p-3">
              <DeterministicQrSvg
                value={result.receipt_no || code}
                size={68}
              />
              <div className="text-xs text-mut">
                <div className="flex items-center gap-1 font-bold text-ink">
                  <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
                  Preuve infalsifiable
                </div>
                Ce reçu électronique constitue une quittance de loyer valide.
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Button asChild className="w-full">
              <a
                href={`/api/receipts/${encodeURIComponent(
                  result.receipt_no || code
                )}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Télécharger le PDF officiel
              </a>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Découvrir LoyerClair</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center" data-testid="invalid-receipt-card">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bad/15 text-bad">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-xl font-extrabold text-bad">
            Reçu introuvable ou non valide
          </h1>
          <p className="mt-2 text-sm text-mut">
            Aucun reçu officiel LoyerClair ne correspond au code{" "}
            <strong className="font-mono text-ink">{code}</strong>.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link href="/">Retour à l’accueil</Link>
          </Button>
        </Card>
      )}
    </main>
  );
}
