import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["admin", "owner"] as const;

export async function POST(req: NextRequest) {
  // 1) Verify caller is admin/owner.
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

  if (!callerProfile || !ADMIN_ROLES.includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) Parse and validate request body.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const location = body.location != null ? String(body.location).trim() || null : null;
  const assigned_officer_id = body.assigned_officer_id != null
    ? String(body.assigned_officer_id).trim() || null
    : null;
  const fish_count = Number(body.fish_count ?? 0);
  const statusRaw = String(body.status ?? "active").trim();
  const notes = body.notes != null ? String(body.notes).trim() || null : null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (isNaN(fish_count) || fish_count < 0) {
    return NextResponse.json(
      { error: "fish_count must be a non-negative number" },
      { status: 400 },
    );
  }
  if (statusRaw !== "active" && statusRaw !== "inactive") {
    return NextResponse.json(
      { error: "status must be active or inactive" },
      { status: 400 },
    );
  }

  const status = statusRaw as "active" | "inactive";

  // 3) If an officer id was supplied, verify that profile exists and has officer role.
  if (assigned_officer_id) {
    const { data: officerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", assigned_officer_id)
      .single();

    if (!officerProfile || officerProfile.role !== "officer") {
      return NextResponse.json(
        { error: "assigned_officer_id must reference a profile with role=officer" },
        { status: 400 },
      );
    }
  }

  // 4) Insert cage.
  const { data: cage, error: insertErr } = await supabase
    .from("cages")
    .insert({
      name,
      location,
      assigned_officer_id,
      fish_count,
      status,
      notes,
    })
    .select("id, name")
    .single();

  if (insertErr || !cage) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Failed to create cage" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, cage });
}
