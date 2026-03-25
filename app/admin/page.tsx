import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["admin", "owner"];

// Defense-in-depth: verify role server-side even if middleware is bypassed.
export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/admin");
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
    <div>
      <h1 className="mb-6 text-2xl font-bold text-blue-700">Admin</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "User Management", description: "Create and manage users, assign roles." },
          { label: "Cage Management", description: "Add, edit, or archive cages." },
          { label: "Water Quality Thresholds", description: "Configure alert thresholds." },
          { label: "Audit Trail", description: "View fish estimate submissions and approvals." },
        ].map(({ label, description }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 className="font-semibold text-gray-800">{label}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        🚧 Admin features coming soon. Connect Supabase to enable management
        actions.
      </p>
    </div>
  );
}
