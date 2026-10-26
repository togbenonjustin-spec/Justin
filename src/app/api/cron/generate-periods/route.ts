import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function checkCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED_CRON" }, { status: 401 });
  }

  const month =
    req.nextUrl.searchParams.get("month") ||
    new Date().toISOString().slice(0, 7);

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, mode: "mock", month, created_count: 0 });
  }

  const { data, error } = await supabase.rpc("generate_rent_periods", {
    p_month: month,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: data });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
