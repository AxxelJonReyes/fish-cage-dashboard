"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseNavLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cages", label: "Cages" },
  { href: "/tasks", label: "Tasks" },
  { href: "/incidents", label: "Incidents" },
];

const adminNavLink = { href: "/admin", label: "Admin" };

interface NavbarClientProps {
  isLoggedIn: boolean;
  role: string | null;
}

export default function NavbarClient({ isLoggedIn, role }: NavbarClientProps) {
  const pathname = usePathname();

  const showAdmin = role === "admin" || role === "owner";
  const navLinks = showAdmin ? [...baseNavLinks, adminNavLink] : baseNavLinks;

  const linkClass = (href: string) =>
    `rounded px-2 py-1 text-sm transition-colors hover:bg-blue-600 ${
      pathname === href ? "bg-blue-800 font-semibold" : ""
    }`;

  const mobileLinkClass = (href: string) =>
    `whitespace-nowrap rounded px-3 py-1 text-sm transition-colors hover:bg-blue-600 ${
      pathname === href ? "bg-blue-800 font-semibold" : ""
    }`;

  return (
    <header className="bg-blue-700 text-white">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between py-3">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            🐟 Fish Cage Dashboard
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-4 sm:flex">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={linkClass(href)}>
                {label}
              </Link>
            ))}

            {isLoggedIn && (
              <form action="/auth/logout" method="POST">
                <button
                  type="submit"
                  className="rounded px-2 py-1 text-sm transition-colors hover:bg-blue-600"
                >
                  Logout
                </button>
              </form>
            )}
          </nav>
        </div>

        {/* Mobile nav */}
        <nav className="flex gap-2 overflow-x-auto pb-2 sm:hidden">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={mobileLinkClass(href)}>
              {label}
            </Link>
          ))}

          {isLoggedIn && (
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="whitespace-nowrap rounded px-3 py-1 text-sm transition-colors hover:bg-blue-600"
              >
                Logout
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
