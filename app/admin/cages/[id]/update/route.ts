import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["admin", "owner"] as const;

export async function PATCH(
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

  // 2) Verify the cage exists.
  const { data: cage } = await supabase
    .from("cages")
    .select("id, assigned_officer_id")
    .eq("id", cageId)
    .single();

  if (!cage) {
    return NextResponse.json({ error: "Cage not found" }, { status: 404 });
  }

  // 3) Officers can only update their assigned cage.
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

  // 5) Build the update payload.
  //    Officers can only update operational fields: fish_count, notes.
  //    Admins can update all fields.
  const updates: Record<string, unknown> = {};

  if ("fish_count" in body) {
    const count = Number(body.fish_count);
    if (isNaN(count) || count < 0) {
      return NextResponse.json(
        { error: "fish_count must be a non-negative number" },
        { status: 400 },
      );
    }
    updates.fish_count = count;
  }

  if ("notes" in body) {
    updates.notes = body.notes != null ? String(body.notes).trim() || null : null;
  }

  if (isAdmin) {
    if ("name" in body) {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return NextResponse.json(
          { error: "name cannot be empty" },
          { status: 400 },
        );
      }
      updates.name = name;
    }

    if ("location" in body) {
      updates.location =
        body.location != null ? String(body.location).trim() || null : null;
    }

    if ("status" in body) {
      const statusRaw = String(body.status ?? "").trim();
      if (statusRaw !== "active" && statusRaw !== "inactive") {
        return NextResponse.json(
          { error: "status must be active or inactive" },
          { status: 400 },
        );
      }
      updates.status = statusRaw;
    }

    if ("assigned_officer_id" in body) {
      const officerId =
        body.assigned_officer_id != null
          ? String(body.assigned_officer_id).trim() || null
          : null;

      if (officerId) {
        const { data: officerProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", officerId)
          .single();

        if (!officerProfile || officerProfile.role !== "officer") {
          return NextResponse.json(
            { error: "assigned_officer_id must reference a profile with role=officer" },
            { status: 400 },
          );
        }
      }

      updates.assigned_officer_id = officerId;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // 6) Perform the update.
  const { error: updateErr } = await supabase
    .from("cages")
    .update(updates)
    .eq("id", cageId);

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
