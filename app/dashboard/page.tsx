// TODO: Fetch summary data from Supabase:
//   - Total active cages
//   - Latest fish estimates per cage (pending approval highlighted)
//   - Recent water quality readings with out-of-range flags
//   - Open incidents count
//   - Overdue tasks count
// TODO: Restrict to authenticated users via middleware.
export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-blue-700">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Cages", value: "—" },
          { label: "Fish Estimates", value: "—" },
          { label: "Open Incidents", value: "—" },
          { label: "Overdue Tasks", value: "—" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{value}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        🚧 Dashboard data coming soon. Connect Supabase to load live data.
      </p>
    </div>
  );
}
