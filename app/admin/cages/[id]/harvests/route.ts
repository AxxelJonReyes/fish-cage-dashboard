import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["admin", "owner"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: cageId } = await params;

  // 1) Verify caller identity.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const callerRole = callerProfile.role as string;
  const isAdmin = ADMIN_ROLES.includes(callerRole as (typeof ADMIN_ROLES)[number]);
  const isOfficer = callerRole === "officer";

  if (!isAdmin && !isOfficer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) Verify cage exists.
  const { data: cage } = await supabase
    .from("cages")
    .select("id, assigned_officer_id")
    .eq("id", cageId)
    .single();

  if (!cage) {
    return NextResponse.json({ error: "Cage not found" }, { status: 404 });
  }

  // 3) Officers may only insert harvests for their assigned cage.
  if (isOfficer && cage.assigned_officer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4) Parse request body.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const harvest_count = Number(body.harvest_count);
  if (isNaN(harvest_count) || harvest_count <= 0) {
    return NextResponse.json(
      { error: "harvest_count must be greater than 0" },
      { status: 400 },
    );
  }

  const notes =
    body.notes != null ? String(body.notes).trim() || null : null;

  let harvested_at: string | undefined;
  if (body.harvested_at != null && String(body.harvested_at).trim()) {
    const parsed = new Date(String(body.harvested_at));
    if (isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "harvested_at is not a valid date" },
        { status: 400 },
      );
    }
    harvested_at = parsed.toISOString();
  }

  // 5) Insert the harvest row.
  const insertData: Record<string, unknown> = {
    cage_id: cageId,
    harvest_count,
    notes,
    created_by: user.id,
  };
  if (harvested_at) {
    insertData.harvested_at = harvested_at;
  }

  const { data: harvest, error: insertErr } = await supabase
    .from("cage_harvests")
    .insert(insertData)
    .select("id")
    .single();

  if (insertErr || !harvest) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Failed to record harvest" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, harvest });
}
