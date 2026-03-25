import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CALLER_ROLES = ["admin", "owner"] as const;
// Admins may create employee or admin — never owner.
const CREATABLE_ROLES = ["employee", "admin", "officer"] as const;

type CreatableRole = (typeof CREATABLE_ROLES)[number];

function toPlaceholderEmail(username: string) {
  return `${username.toLowerCase()}@fishcage.local`;
}

export async function POST(req: NextRequest) {
  // 1) Verify the caller is authenticated and has admin/owner role.
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

  if (!callerProfile || !CALLER_ROLES.includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) Parse and validate the request body.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  const full_name = String(body.full_name ?? "").trim();
  const roleRaw = String(body.role ?? "").trim();
  const password = String(body.password ?? "");

  if (!username) {
    return NextResponse.json(
      { error: "username is required" },
      { status: 400 },
    );
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "password must be at least 6 characters" },
      { status: 400 },
    );
  }
  if (!CREATABLE_ROLES.includes(roleRaw as CreatableRole)) {
    return NextResponse.json(
      { error: "role must be employee, officer, or admin" },
      { status: 400 },
    );
  }

  const role = roleRaw as CreatableRole;

  const email = toPlaceholderEmail(username);

  // 3) Create the auth user via service-role client.
  const adminClient = createAdminClient();

  const { data: created, error: createErr } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification for placeholder addresses
    });

  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Failed to create user" },
      { status: 400 },
    );
  }

  // 4) Upsert the profile row.
  const { error: upsertErr } = await adminClient.from("profiles").upsert({
    id: created.user.id,
    username,
    full_name: full_name || null,
    role,
  });

  if (upsertErr) {
    // Profile write failed — delete the orphaned auth user to keep data consistent.
    await adminClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: `Failed to save profile: ${upsertErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: created.user.id,
      username,
      full_name: full_name || null,
      role,
    },
  });
}
