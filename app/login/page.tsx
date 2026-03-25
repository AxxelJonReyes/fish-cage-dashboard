import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-blue-700">Sign In</h1>
        <p className="mb-6 text-sm text-gray-500">
          Sign in to manage your fish cage operations.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
