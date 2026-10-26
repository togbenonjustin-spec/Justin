import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { formatFCFA } from "@/lib/utils";

export interface ReceiptPdfData {
  receipt_no: string;
  verification_code: string;
  tenant_name: string;
  tenant_phone?: string;
  property_name: string;
  unit_label: string;
  landlord_name: string;
  period_label: string;
  amount: number;
  operator_label: string;
  issued_at: string;
  verify_url: string;
}

/**
 * Génère un PDF officiel de reçu de loyer LoyerClair (format A5/A4 portrait épuré)
 * avec QR Code de vérification intégré et tampon "PAYÉ OFFICIEL".
 */
export async function generateReceiptPdfBytes(
  data: ReceiptPdfData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Reçu LoyerClair ${data.receipt_no}`);
  pdfDoc.setAuthor("LoyerClair Bénin");
  pdfDoc.setSubject(`Quittance de loyer - ${data.period_label} - ${data.tenant_name}`);

  const page = pdfDoc.addPage([420, 595]); // Format A5 officiel pratique sur mobile WhatsApp
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Couleurs LoyerClair (#0B6B4F émeraude, #F5B83D or, #0F1A17 encre, #FAFAF7 fond)
  const emerald = rgb(0.043, 0.42, 0.31);
  const gold = rgb(0.96, 0.72, 0.24);
  const ink = rgb(0.059, 0.102, 0.09);
  const muted = rgb(0.369, 0.427, 0.408);
  const line = rgb(0.9, 0.91, 0.886);
  const bgCream = rgb(0.98, 0.98, 0.969);

  // Fond général
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: bgCream,
  });

  // Bandeau supérieur émeraude
  page.drawRectangle({
    x: 24,
    y: height - 108,
    width: width - 48,
    height: 84,
    color: emerald,
  });

  // Accent Or
  page.drawRectangle({
    x: 24,
    y: height - 112,
    width: width - 48,
    height: 4,
    color: gold,
  });

  // Titre marque
  page.drawText("LoyerClair", {
    x: 42,
    y: height - 56,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("RECU OFFICIEL DE PAIEMENT DE LOYER - BENIN", {
    x: 42,
    y: height - 76,
    size: 8.5,
    font: fontBold,
    color: gold,
  });

  page.drawText(`No ${data.receipt_no}`, {
    x: 42,
    y: height - 94,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // Badge PAYÉ en haut à droite
  page.drawRectangle({
    x: width - 118,
    y: height - 74,
    width: 76,
    height: 28,
    color: gold,
  });
  page.drawText("PAYE", {
    x: width - 96,
    y: height - 65,
    size: 12,
    font: fontBold,
    color: ink,
  });

  // Carte principale
  page.drawRectangle({
    x: 24,
    y: 165,
    width: width - 48,
    height: height - 295,
    color: rgb(1, 1, 1),
    borderColor: line,
    borderWidth: 1,
  });

  // Montant principal mis en avant
  page.drawText("MONTANT ENCAISSE", {
    x: 42,
    y: height - 148,
    size: 9,
    font: fontBold,
    color: muted,
  });

  page.drawText(formatFCFA(data.amount), {
    x: 42,
    y: height - 174,
    size: 24,
    font: fontBold,
    color: emerald,
  });

  page.drawLine({
    start: { x: 42, y: height - 190 },
    end: { x: width - 42, y: height - 190 },
    thickness: 1,
    color: line,
  });

  // Lignes de détail
  const issuedDate = new Date(data.issued_at).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Porto-Novo",
  });

  const rows: Array<[string, string]> = [
    ["Locataire", data.tenant_name],
    ["Telephone", data.tenant_phone || "Non renseigne"],
    ["Bien immobilier", data.property_name],
    ["Logement / Lot", data.unit_label],
    ["Proprietaire / Bailleur", data.landlord_name],
    ["Periode acquittee", data.period_label],
    ["Mode de reglement", data.operator_label],
    ["Date et heure (Cotonou)", issuedDate],
    ["Code de verification", data.verification_code],
  ];

  let yPos = height - 214;
  for (const [label, val] of rows) {
    // Nettoie les caractères hors WinAnsi au cas où
    const safeVal = val.replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
    page.drawText(label, {
      x: 42,
      y: yPos,
      size: 9.5,
      font: fontRegular,
      color: muted,
    });
    page.drawText(safeVal, {
      x: 185,
      y: yPos,
      size: 10,
      font: fontBold,
      color: ink,
    });
    yPos -= 23;
  }

  // Zone QR Code en bas
  const qrPngBuffer = await QRCode.toBuffer(data.verify_url, {
    type: "png",
    width: 200,
    margin: 1,
    color: {
      dark: "#0B6B4F",
      light: "#FFFFFF",
    },
  });

  const qrImage = await pdfDoc.embedPng(qrPngBuffer);
  page.drawImage(qrImage, {
    x: 36,
    y: 44,
    width: 96,
    height: 96,
  });

  page.drawText("Authenticite verifiable par QR Code", {
    x: 146,
    y: 118,
    size: 10.5,
    font: fontBold,
    color: ink,
  });

  page.drawText(
    "Scannez ce code avec votre telephone pour verifier\nque ce recu officiel a bien ete emis par LoyerClair.",
    {
      x: 146,
      y: 96,
      size: 8.5,
      font: fontRegular,
      color: muted,
      lineHeight: 12,
    }
  );

  page.drawText(`URL : ${data.verify_url}`, {
    x: 146,
    y: 66,
    size: 8,
    font: fontBold,
    color: emerald,
  });

  page.drawText(
    `Emis electroniquement conformement au Code du Numerique en Republique du Benin.`,
    {
      x: 146,
      y: 50,
      size: 7.5,
      font: fontRegular,
      color: muted,
    }
  );

  return await pdfDoc.save();
}
