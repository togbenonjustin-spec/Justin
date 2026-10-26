import { NextRequest, NextResponse } from "next/server";
import {
  getTenantInviteByToken,
} from "@/lib/data/loyerclair";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const data = await getTenantInviteByToken(params.token);
    if (!data) {
      return NextResponse.json({ error: "INVITE_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "INVITE_ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      optOutReminders?: boolean;
    };

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      if (body.optOutReminders !== undefined) {
        await supabase
          .from("tenants")
          .update({
            opt_out_reminders: body.optOutReminders,
            updated_at: new Date().toISOString(),
          })
          .eq("invite_token", params.token);
      }

      const { data, error } = await supabase.rpc("claim_invite", {
        p_token: params.token,
        p_user_id: body.userId ?? null,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, claimed: data });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CLAIM_INVITE_ERROR";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
