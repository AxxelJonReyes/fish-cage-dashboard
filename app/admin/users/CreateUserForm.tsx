"use client";

import { useState } from "react";

interface CreatedUser {
  id: string;
  username: string;
  full_name: string | null;
  role: string;
}

export default function CreateUserForm() {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedUser | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);

    // Client-side validation
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          full_name: fullName.trim(),
          role,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "An unexpected error occurred.");
      } else {
        setCreated(data.user);
        // Reset form on success
        setUsername("");
        setFullName("");
        setRole("employee");
        setPassword("");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      {/* Username */}
      <div>
        <label
          htmlFor="username"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Username <span className="text-red-500">*</span>
        </label>
        <input
          id="username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. juan"
        />
        <p className="mt-1 text-xs text-gray-400">
          Used to log in. Email will be{" "}
          <span className="font-mono">
            {username.trim().toLowerCase() || "username"}@fishcage.local
          </span>
        </p>
      </div>

      {/* Full name (optional) */}
      <div>
        <label
          htmlFor="full_name"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Full Name <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="full_name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Juan dela Cruz"
        />
      </div>

      {/* Role */}
      <div>
        <label
          htmlFor="role"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Role <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "employee" | "admin")}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Password <span className="text-red-500">*</span>
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Min. 6 characters"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Success message */}
      {created && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-semibold">User created successfully!</p>
          <ul className="mt-1 list-inside list-disc text-green-700">
            <li>
              <span className="font-medium">Username:</span> {created.username}
            </li>
            {created.full_name && (
              <li>
                <span className="font-medium">Full name:</span>{" "}
                {created.full_name}
              </li>
            )}
            <li>
              <span className="font-medium">Role:</span> {created.role}
            </li>
          </ul>
          <p className="mt-2 text-xs text-green-600">
            The user can now log in at{" "}
            <span className="font-mono">/login</span> with their username and
            password.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create User"}
      </button>
    </form>
  );
}
