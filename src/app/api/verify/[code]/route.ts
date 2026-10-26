import { NextRequest, NextResponse } from "next/server";
import { verifyPublicReceipt } from "@/lib/data/loyerclair";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const result = await verifyPublicReceipt(decodeURIComponent(params.code));
    return NextResponse.json(result, {
      status: result.valid ? 200 : 404,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "VERIFY_RECEIPT_ERROR";
    return NextResponse.json({ valid: false, error: msg }, { status: 500 });
  }
}
