"use client";

import React from "react";
import Link from "next/link";
import { Download, ExternalLink, Share2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/utils";
import type { ReceiptItem } from "@/lib/data/loyerclair";

/**
 * Génère une matrice SVG QR déterministe lisible visuellement
 * (le PDF officiel embarque quant à lui le QR PNG normé ISO/IEC 18004)
 */
export function DeterministicQrSvg({
  value,
  size = 84,
}: {
  value: string;
  size?: number;
}) {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  let path = "";
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < 13; x++) {
      const finder =
        (x < 3 && y < 3) || (x > 9 && y < 3) || (x < 3 && y > 9);
      h = (h * 1103515245 + 12345) >>> 0;
      if (finder || (h >>> 16) % 2 === 1) {
        path += `M${x} ${y}h1v1h-1z`;
      }
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13 13"
      className="shrink-0 rounded-xl border border-line bg-white p-1.5 text-[#0B6B4F]"
      aria-label={`QR Code de vérification ${value}`}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}

interface ReceiptModalProps {
  receipt: ReceiptItem | null;
  onClose: () => void;
  onShareToast?: (msg: string) => void;
}

export function ReceiptModal({
  receipt,
  onClose,
  onShareToast,
}: ReceiptModalProps) {
  if (!receipt) return null;

  const verifyPath = `/verify/${receipt.receipt_no}`;
  const pdfPath = `/api/receipts/${encodeURIComponent(receipt.receipt_no)}/pdf`;
  const formattedDate = new Date(receipt.issued_at).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const handleWhatsAppShare = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${verifyPath}`
        : verifyPath;
    const text = `🧾 Reçu officiel LoyerClair N° ${receipt.receipt_no}\nLocataire : ${receipt.tenant_name} (${receipt.unit_label})\nPériode : ${receipt.period_label}\nMontant : ${formatFCFA(receipt.amount)} (${receipt.operator_label})\nVérifier l'authenticité (QR) : ${url}`;
    if (typeof window !== "undefined" && navigator.share) {
      navigator
        .share({ title: `Reçu ${receipt.receipt_no}`, text, url })
        .catch(() => {});
    } else if (typeof window !== "undefined") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
    onShareToast?.("Reçu prêt à partager sur WhatsApp ✅");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div className="w-full max-w-[520px] animate-in slide-in-from-bottom-6 rounded-t-[28px] bg-bg p-5 pb-8 shadow-2xl sm:rounded-[28px]">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-mut">
            Quittance numérique vérifiable
          </span>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-ink"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Carte Reçu Officiel */}
        <div className="relative rounded-[22px] border-2 border-dashed border-line bg-card p-5">
          <span className="absolute right-4 top-4 rotate-[8deg] rounded-lg border-2 border-ok px-2.5 py-0.5 text-xs font-extrabold tracking-wide text-ok">
            PAYÉ
          </span>

          <div className="text-lg font-extrabold tracking-tight">
            Loyer<span className="text-acc">Clair</span>
          </div>
          <div className="text-xs text-mut">Reçu officiel de paiement</div>

          <h3
            id="receipt-modal-title"
            className="mt-2 font-mono text-xl font-extrabold text-ink"
          >
            {receipt.receipt_no}
          </h3>

          <div className="mt-3 divide-y divide-line/60 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-mut">Locataire</span>
              <span className="font-bold">{receipt.tenant_name}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-mut">Bien & Logement</span>
              <span className="font-bold">
                {receipt.property_name} · {receipt.unit_label}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-mut">Propriétaire</span>
              <span className="font-bold">{receipt.landlord_name}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-mut">Période</span>
              <span className="font-bold">{receipt.period_label}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-mut">Opérateur</span>
              <span className="font-bold">{receipt.operator_label}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-mut">Date</span>
              <span className="font-bold">{formattedDate}</span>
            </div>
            <div className="flex items-center justify-between pt-3 text-lg">
              <span className="font-semibold text-mut">Montant acquitté</span>
              <span className="font-extrabold text-ok">
                {formatFCFA(receipt.amount)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3.5 rounded-2xl bg-bg p-3">
            <DeterministicQrSvg value={receipt.receipt_no} size={76} />
            <div className="text-xs leading-relaxed text-mut">
              <div className="flex items-center gap-1 font-bold text-ok">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Reçu authentique vérifié
              </div>
              <div>
                Code :{" "}
                <span className="font-mono font-bold text-ink">
                  {receipt.verification_code}
                </span>
              </div>
              <Link
                href={verifyPath}
                className="mt-1 inline-flex items-center gap-1 font-bold text-pri underline"
              >
                Ouvrir la page de vérification QR{" "}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Button onClick={handleWhatsAppShare} className="w-full">
            <Share2 className="h-4 w-4" />
            Partager WhatsApp
          </Button>
          <Button variant="outline" asChild className="w-full">
            <a href={pdfPath} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
              Télécharger PDF
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
