"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cages", label: "Cages" },
  { href: "/tasks", label: "Tasks" },
  { href: "/incidents", label: "Incidents" },
  { href: "/admin", label: "Admin" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="bg-blue-700 text-white">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between py-3">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            🐟 Fish Cage Dashboard
          </Link>

          {/* Desktop nav */}
          <nav className="hidden gap-4 sm:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded px-2 py-1 text-sm transition-colors hover:bg-blue-600 ${
                  pathname === href ? "bg-blue-800 font-semibold" : ""
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile nav */}
        <nav className="flex gap-2 overflow-x-auto pb-2 sm:hidden">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap rounded px-3 py-1 text-sm transition-colors hover:bg-blue-600 ${
                pathname === href ? "bg-blue-800 font-semibold" : ""
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
