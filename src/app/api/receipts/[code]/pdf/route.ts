import { NextRequest, NextResponse } from "next/server";
import { verifyPublicReceipt } from "@/lib/data/loyerclair";
import { generateReceiptPdfBytes } from "@/lib/receipts/pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = decodeURIComponent(params.code);
    const verified = await verifyPublicReceipt(code);

    if (!verified.valid || !verified.receipt_no) {
      return NextResponse.json({ error: "RECEIPT_NOT_FOUND" }, { status: 404 });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const verifyUrl = `${origin}/verify/${verified.receipt_no}`;

    const pdfBytes = await generateReceiptPdfBytes({
      receipt_no: verified.receipt_no,
      verification_code: verified.verification_code || "LC-VERIFIED",
      tenant_name: verified.tenant_name || "Locataire",
      property_name: verified.property_name || "Résidence LoyerClair",
      unit_label: verified.unit_label || "Logement",
      landlord_name: verified.landlord_name || "Propriétaire",
      period_label: verified.period_label || "Mensualité",
      amount: Number(verified.amount || 0),
      operator_label: verified.operator_label || "Mobile Money",
      issued_at: verified.issued_at || new Date().toISOString(),
      verify_url: verifyUrl,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${verified.receipt_no}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF_GENERATION_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
