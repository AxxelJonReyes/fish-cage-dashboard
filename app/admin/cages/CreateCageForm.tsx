"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Officer {
  id: string;
  username: string;
  full_name: string | null;
}

interface CreateCageFormProps {
  officers: Officer[];
}

export default function CreateCageForm({ officers }: CreateCageFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [assignedOfficerId, setAssignedOfficerId] = useState("");
  const [fishCount, setFishCount] = useState("0");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setLocation("");
    setAssignedOfficerId("");
    setFishCount("0");
    setStatus("active");
    setNotes("");
    setError(null);
  }

  function handleCancel() {
    reset();
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const count = parseInt(fishCount, 10);
    if (isNaN(count) || count < 0) {
      setError("Fish count must be a non-negative number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/admin/cages/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || null,
          assigned_officer_id: assignedOfficerId || null,
          fish_count: count,
          status,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "An unexpected error occurred.");
      } else {
        reset();
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
      >
        + New Cage
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">New Cage</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <label
            htmlFor="cage-name"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Cage Name <span className="text-red-500">*</span>
          </label>
          <input
            id="cage-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Cage A"
          />
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="cage-location"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Location{" "}
            <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="cage-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Section 3, Laguna Lake"
          />
        </div>

        {/* Assigned Officer */}
        <div>
          <label
            htmlFor="cage-officer"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Assigned Officer{" "}
            <span className="text-gray-400">(optional)</span>
          </label>
          <select
            id="cage-officer"
            value={assignedOfficerId}
            onChange={(e) => setAssignedOfficerId(e.target.value)}
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

        <div className="grid grid-cols-2 gap-4">
          {/* Fish Count */}
          <div>
            <label
              htmlFor="cage-fish-count"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Initial Fish Count
            </label>
            <input
              id="cage-fish-count"
              type="number"
              min="0"
              value={fishCount}
              onChange={(e) => setFishCount(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="cage-status"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="cage-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="cage-notes"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Notes{" "}
            <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="cage-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Any additional notes…"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create Cage"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
