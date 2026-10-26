import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { DEFAULT_LANDLORD_ID, DEFAULT_ORG_ID } from "@/lib/data/loyerclair";

const createPropertySchema = z.object({
  ownerId: z.string().uuid().optional(),
  name: z.string().min(2),
  city: z.string().min(2).default("Cotonou"),
  neighborhood: z.string().optional().default(""),
  address: z.string().optional().default(""),
  unitsCount: z.number().int().min(1).default(4),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createPropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_PROPERTY_INPUT", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const ownerId = d.ownerId || DEFAULT_LANDLORD_ID;
    const supabase = createSupabaseAdminClient();

    if (supabase) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", ownerId)
        .limit(1)
        .maybeSingle();

      const orgId = org?.id ?? DEFAULT_ORG_ID;

      const { data: created, error } = await supabase
        .from("properties")
        .insert({
          org_id: orgId,
          owner_id: ownerId,
          name: d.name,
          city: d.city,
          neighborhood: d.neighborhood,
          address: d.address,
          units_count: d.unitsCount,
        })
        .select("*")
        .single();

      if (error || !created) {
        return NextResponse.json(
          { error: error?.message ?? "CREATE_PROPERTY_ERROR" },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true, property: created }, { status: 201 });
    }

    return NextResponse.json(
      {
        ok: true,
        property: {
          id: `prop-${Date.now()}`,
          name: d.name,
          city: d.city,
          neighborhood: d.neighborhood,
          units_count: d.unitsCount,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PROPERTY_ERROR";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
