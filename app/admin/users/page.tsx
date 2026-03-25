import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateUserForm from "./CreateUserForm";

const ADMIN_ROLES = ["admin", "owner"];

// Defense-in-depth: verify role server-side even if middleware is bypassed.
export default async function AdminUsersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/admin/users");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-2">
        <Link
          href="/admin"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Admin
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-600">User Management</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-blue-700">
        Create New User
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Create an account for a new employee or admin. The user will log in with
        their <strong>username</strong> and <strong>password</strong> — no real
        email required.
      </p>

      <CreateUserForm />

      <p className="mt-4 rounded-md bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
        ⚠️ Passwords cannot be reset via email since placeholder addresses are
        used. To change a password, update it manually in the Supabase
        dashboard.
      </p>
    </div>
  );
}
