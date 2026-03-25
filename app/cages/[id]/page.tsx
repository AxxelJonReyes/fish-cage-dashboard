// TODO: Fetch individual cage details from Supabase by cage ID (params.id).
// TODO: Display sections:
//   - Cage info (name, location, assigned staff)
//   - Quarterly fish estimate (current quarter, submission history, approval status)
//   - Water quality readings (latest + trend)
//   - Fish size measurements + growth chart
//   - Daily logs
//   - Open tasks
//   - Incident reports
// TODO: Role-based actions (submit estimate, approve estimate, add log).
// TODO: Restrict to authenticated users via middleware.

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CageDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-blue-700">Cage #{id}</h1>
      <p className="mb-6 text-sm text-gray-500">Cage detail view</p>

      <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        🚧 Cage detail coming soon. Connect Supabase to load data for cage{" "}
        <strong>{id}</strong>.
      </p>
    </div>
  );
}
