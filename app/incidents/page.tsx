// TODO: Fetch incidents from Supabase (table: incidents).
// TODO: Show incident title, severity, cage, reported by, status, date.
// TODO: Role-based actions: report incident (all roles), resolve, add notes.
// TODO: Filter by severity (critical, high, medium, low) and status.
// TODO: Restrict to authenticated users via middleware.
export default function IncidentsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-blue-700">Incidents</h1>

      <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        🚧 Incident list coming soon. Connect Supabase to load incidents.
      </p>
    </div>
  );
}
