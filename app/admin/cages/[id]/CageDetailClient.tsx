"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

interface CageDetailClientProps {
  cageId: string;
  isAdmin: boolean;
  currentFishCount: number;
  currentNotes: string | null;
  currentStatus: string;
  officers: Officer[];
  currentOfficerId: string | null;
  currentName: string;
  currentLocation: string | null;
  harvests: Harvest[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CageDetailClient({
  cageId,
  isAdmin,
  currentFishCount,
  currentNotes,
  currentStatus,
  officers,
  currentOfficerId,
  currentName,
  currentLocation,
  harvests,
}: CageDetailClientProps) {
  const router = useRouter();

  // --- Edit cage fields state ---
  const [fishCount, setFishCount] = useState(String(currentFishCount));
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [status, setStatus] = useState(currentStatus);
  const [officerId, setOfficerId] = useState(currentOfficerId ?? "");
  const [name, setName] = useState(currentName);
  const [location, setLocation] = useState(currentLocation ?? "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // --- Add harvest state ---
  const [harvestCount, setHarvestCount] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [harvestNotes, setHarvestNotes] = useState("");
  const [harvestLoading, setHarvestLoading] = useState(false);
  const [harvestError, setHarvestError] = useState<string | null>(null);
  const [harvestSuccess, setHarvestSuccess] = useState(false);

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    setEditSuccess(false);

    const count = parseInt(fishCount, 10);
    if (isNaN(count) || count < 0) {
      setEditError("Fish count must be a non-negative number.");
      return;
    }

    setEditLoading(true);
    try {
      const body: Record<string, unknown> = {
        fish_count: count,
        notes: notes.trim() || null,
      };

      if (isAdmin) {
        body.status = status;
        body.assigned_officer_id = officerId || null;
        body.name = name.trim();
        body.location = location.trim() || null;
      }

      const res = await fetch(`/admin/cages/${cageId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "An unexpected error occurred.");
      } else {
        setEditSuccess(true);
        router.refresh();
      }
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleHarvestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHarvestError(null);
    setHarvestSuccess(false);

    const count = parseInt(harvestCount, 10);
    if (isNaN(count) || count <= 0) {
      setHarvestError("Harvest count must be greater than 0.");
      return;
    }

    setHarvestLoading(true);
    try {
      const body: Record<string, unknown> = {
        harvest_count: count,
        notes: harvestNotes.trim() || null,
      };
      if (harvestDate) {
        body.harvested_at = new Date(harvestDate).toISOString();
      }

      const res = await fetch(`/admin/cages/${cageId}/harvests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setHarvestError(data.error ?? "An unexpected error occurred.");
      } else {
        setHarvestSuccess(true);
        setHarvestCount("");
        setHarvestDate("");
        setHarvestNotes("");
        router.refresh();
      }
    } catch {
      setHarvestError("Network error. Please try again.");
    } finally {
      setHarvestLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Edit Cage Form */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-800">
          {isAdmin ? "Edit Cage" : "Update Operational Fields"}
        </h2>
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          {isAdmin && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Name */}
                <div>
                  <label
                    htmlFor="edit-name"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Cage Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {/* Location */}
                <div>
                  <label
                    htmlFor="edit-location"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Location
                  </label>
                  <input
                    id="edit-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Status */}
                <div>
                  <label
                    htmlFor="edit-status"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    id="edit-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {/* Assigned Officer */}
                <div>
                  <label
                    htmlFor="edit-officer"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Assigned Officer
                  </label>
                  <select
                    id="edit-officer"
                    value={officerId}
                    onChange={(e) => setOfficerId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">— Unassigned —</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.username}
                        {o.full_name ? ` (${o.full_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Fish Count */}
            <div>
              <label
                htmlFor="edit-fish-count"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Fish Count
              </label>
              <input
                id="edit-fish-count"
                type="number"
                min="0"
                value={fishCount}
                onChange={(e) => setFishCount(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="edit-notes"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Notes
            </label>
            <textarea
              id="edit-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {editError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {editError}
            </p>
          )}
          {editSuccess && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Changes saved successfully.
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={editLoading}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
            >
              {editLoading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      {/* Add Harvest Form */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-800">
          Record Harvest
        </h2>
        <form onSubmit={handleHarvestSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Harvest Count */}
            <div>
              <label
                htmlFor="harvest-count"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Harvest Count <span className="text-red-500">*</span>
              </label>
              <input
                id="harvest-count"
                type="number"
                min="1"
                required
                value={harvestCount}
                onChange={(e) => setHarvestCount(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. 500"
              />
            </div>

            {/* Harvest Date */}
            <div>
              <label
                htmlFor="harvest-date"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Date{" "}
                <span className="text-gray-400">(optional, defaults to now)</span>
              </label>
              <input
                id="harvest-date"
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Harvest Notes */}
          <div>
            <label
              htmlFor="harvest-notes"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="harvest-notes"
              rows={2}
              value={harvestNotes}
              onChange={(e) => setHarvestNotes(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Any notes about this harvest…"
            />
          </div>

          {harvestError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {harvestError}
            </p>
          )}
          {harvestSuccess && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Harvest recorded successfully.
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={harvestLoading}
              className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-60"
            >
              {harvestLoading ? "Recording…" : "Record Harvest"}
            </button>
          </div>
        </form>
      </section>

      {/* Harvest History Table */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-800">
          Harvest History
        </h2>
        {harvests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              No harvests recorded yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">
                    Count
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Recorded by
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {harvests.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(h.harvested_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {h.harvest_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {h.notes ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {h.created_by_profile?.username ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
