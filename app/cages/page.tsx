// TODO: Fetch list of all cages from Supabase (table: cages).
// TODO: Show cage name, assigned staff, latest fish estimate, water quality status.
// TODO: Link each cage to its detail page /cages/[id].
// TODO: Restrict to authenticated users via middleware.
export default function CagesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-blue-700">Cages</h1>

      <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        🚧 Cage list coming soon. Connect Supabase to load cage data.
      </p>
    </div>
  );
}
