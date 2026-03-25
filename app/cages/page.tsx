import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Officer {
  id: string;
  username: string;
  full_name: string | null;
}

interface Cage {
  id: string;
  name: string;
  location: string | null;
  fish_count: number;
  status: string;
  notes: string | null;
  assigned_officer_id: string | null;
  assigned_officer: Officer | null;
}

export default async function CagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectedFrom=/cages");
  }

  const { data: cages, error } = await supabase
    .from("cages")
    .select(
      `id, name, location, fish_count, status, notes, assigned_officer_id,
       assigned_officer:profiles!cages_assigned_officer_id_fkey(id, username, full_name)`,
    )
    .order("name", { ascending: true });

  if (error) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-blue-700">Cages</h1>
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load cage data. Please try again later.
        </p>
      </div>
    );
  }

  const cageList = (cages ?? []) as unknown as Cage[];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">Cages</h1>
          <p className="mt-1 text-sm text-gray-500">
            {cageList.length} cage{cageList.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {cageList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">No cages found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Location
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Officer
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">
                  Fish Count
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cageList.map((cage) => (
                <tr
                  key={cage.id}
                  className="transition-colors hover:bg-blue-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link
                      href={`/cages/${cage.id}`}
                      className="text-blue-700 hover:underline"
                    >
                      {cage.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {cage.location ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {cage.assigned_officer ? (
                      cage.assigned_officer.username
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {cage.fish_count.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        cage.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {cage.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
