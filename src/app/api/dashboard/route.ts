import { NextRequest, NextResponse } from "next/server";
import { getLandlordDashboard, DEFAULT_LANDLORD_ID } from "@/lib/data/loyerclair";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ownerId =
      req.nextUrl.searchParams.get("ownerId") || DEFAULT_LANDLORD_ID;
    const dashboard = await getLandlordDashboard(ownerId);
    return NextResponse.json(dashboard);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DASHBOARD_ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
