import { NextRequest, NextResponse } from "next/server";
import { getLandlordDashboard, DEFAULT_LANDLORD_ID } from "@/lib/data/loyerclair";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ownerId =
      req.nextUrl.searchParams.get("ownerId") || DEFAULT_LANDLORD_ID;
    const dashboard = await getLandlordDashboard(ownerId);

    const header = [
      "Periode",
      "Locataire",
      "Telephone",
      "Bien",
      "Logement",
      "Loyer_Attendu_FCFA",
      "Montant_Paye_FCFA",
      "Reste_A_Payer_FCFA",
      "Statut",
      "Echeance",
      "Dernier_Recu",
    ].join(";");

    const rows = dashboard.tenants.map((t) => {
      const latestRcp = dashboard.receipts.find((r) => r.tenant_id === t.id);
      return [
        t.period_label,
        `"${t.full_name.replace(/"/g, '""')}"`,
        `"${t.phone}"`,
        `"${t.property_name.replace(/"/g, '""')}"`,
        `"${t.unit_label.replace(/"/g, '""')}"`,
        t.amount_due,
        t.amount_paid,
        t.remaining,
        t.status.toUpperCase(),
        t.due_date,
        latestRcp ? latestRcp.receipt_no : "",
      ].join(";");
    });

    // BOM UTF-8 pour ouverture directe dans Excel (accents français préservés)
    const csvContent = "\uFEFF" + [header, ...rows].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="loyerclair-export-${dashboard.period_label
          .toLowerCase()
          .replace(/\s+/g, "-")}.csv"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CSV_EXPORT_ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
