import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="mb-4 text-3xl font-bold text-blue-700">
        🐟 Fish Cage Dashboard
      </h1>
      <p className="mb-8 max-w-md text-gray-600">
        A mobile-first web application for managing tilapia fish cage operations
        on Laguna Lake.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-blue-700 px-6 py-2 text-white transition-colors hover:bg-blue-800"
      >
        Sign In
      </Link>
    </div>
  );
}
