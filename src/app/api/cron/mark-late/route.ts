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

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, mode: "mock", marked_late_count: 0 });
  }

  const { data, error } = await supabase.rpc("mark_late_periods");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: data });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
