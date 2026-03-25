import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CageDetailClient from "./CageDetailClient";

const ADMIN_ROLES = ["admin", "owner"];

interface Officer {
  id: string;
  username: string;
  full_name: string | null;
}

interface Harvest {
  id: string;
  harvest_count: number;
  harvested_at: string;
  notes: string | null;
  created_by_profile: { username: string } | null;
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

export default async function CageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectedFrom=/admin/cages/${id}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/dashboard");
  }

  const role = profile.role as string;
  const isAdmin = ADMIN_ROLES.includes(role);
  const isOfficer = role === "officer";

  if (!isAdmin && !isOfficer) {
    redirect("/dashboard");
  }

  // Fetch cage details.
  const { data: cage } = await supabase
    .from("cages")
    .select(
      `id, name, location, fish_count, status, notes, assigned_officer_id,
       assigned_officer:profiles!cages_assigned_officer_id_fkey(id, username, full_name)`,
    )
    .eq("id", id)
    .single();

  if (!cage) {
    notFound();
  }

  const cageData = cage as unknown as Cage;

  // Officers can only view their assigned cage.
  if (isOfficer && cageData.assigned_officer_id !== user.id) {
    redirect("/dashboard");
  }

  // Fetch harvest history for this cage.
  const { data: harvests } = await supabase
    .from("cage_harvests")
    .select(
      `id, harvest_count, harvested_at, notes,
       created_by_profile:profiles!cage_harvests_created_by_fkey(username)`,
    )
    .eq("cage_id", id)
    .order("harvested_at", { ascending: false });

  const harvestList = (harvests ?? []) as unknown as Harvest[];

  // Compute stats from harvest history.
  const totalHarvested = harvestList.reduce(
    (sum, h) => sum + h.harvest_count,
    0,
  );
  const lastHarvest =
    harvestList.length > 0 ? harvestList[0].harvested_at : null;

  // Fetch officers for the edit form (admin only).
  const officerList: Officer[] = [];
  if (isAdmin) {
    const { data: officersData } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .eq("role", "officer")
      .order("username");
    officerList.push(...((officersData ?? []) as Officer[]));
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/admin" className="text-blue-600 hover:underline">
          Admin
        </Link>
        <span className="text-gray-400">/</span>
        <Link href="/admin/cages" className="text-blue-600 hover:underline">
          Cage Management
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">{cageData.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              {cageData.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              {cageData.location && (
                <span>📍 {cageData.location}</span>
              )}
              <span>
                👤{" "}
                {cageData.assigned_officer
                  ? cageData.assigned_officer.username
                  : "Unassigned"}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  cageData.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {cageData.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Current Fish Count
          </p>
          <p className="mt-1 text-3xl font-bold text-blue-700">
            {cageData.fish_count.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Harvested
          </p>
          <p className="mt-1 text-3xl font-bold text-green-700">
            {totalHarvested.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Last Harvest
          </p>
          <p className="mt-1 text-xl font-semibold text-gray-700">
            {lastHarvest ? formatDate(lastHarvest) : "—"}
          </p>
        </div>
      </div>

      {/* Interactive forms and harvest history */}
      <CageDetailClient
        cageId={id}
        isAdmin={isAdmin}
        currentFishCount={cageData.fish_count}
        currentNotes={cageData.notes}
        currentStatus={cageData.status}
        officers={officerList}
        currentOfficerId={cageData.assigned_officer_id}
        currentName={cageData.name}
        currentLocation={cageData.location}
        harvests={harvestList}
      />
    </div>
  );
}
