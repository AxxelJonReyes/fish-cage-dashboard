// TODO: Implement login form with Supabase Auth (email/password or magic link).
// TODO: Redirect authenticated users to /dashboard.
export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-blue-700">Sign In</h1>
        <p className="mb-6 text-sm text-gray-500">
          Sign in to manage your fish cage operations.
        </p>
        {/* TODO: Replace with Supabase Auth UI or custom form */}
        <p className="rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          🚧 Login form coming soon. Connect Supabase to enable authentication.
        </p>
      </div>
    </div>
  );
}
