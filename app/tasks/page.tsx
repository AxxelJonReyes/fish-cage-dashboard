// TODO: Fetch tasks from Supabase (table: tasks).
// TODO: Show task title, assigned cage, assigned user, due date, status.
// TODO: Role-based actions: create task (officer/admin), mark complete, add comment.
// TODO: Filter by status (open, in-progress, completed, overdue).
// TODO: Restrict to authenticated users via middleware.
export default function TasksPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-blue-700">Tasks</h1>

      <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        🚧 Task list coming soon. Connect Supabase to load tasks.
      </p>
    </div>
  );
}
