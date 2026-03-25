import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const PROTECTED_PATHS = [
  "/dashboard",
  "/cages",
  "/tasks",
  "/incidents",
  "/admin",
];

const ADMIN_PATHS = ["/admin"];

// Admin paths that officers are also permitted to access.
const OFFICER_ACCESSIBLE_PATHS = ["/admin/cages/"];

const ADMIN_ROLES = ["admin", "owner"];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isAdminPath(pathname: string) {
  return ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isOfficerAccessiblePath(pathname: string) {
  return OFFICER_ACCESSIBLE_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response to forward cookies from the Supabase client.
  let response = NextResponse.next({ request });

  const supabase = createMiddlewareClient(request, response);

  // Refresh the session (rotates tokens if needed) — always do this first.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Logged-in user visiting /login → redirect to /dashboard
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated user visiting a protected path → redirect to /login
  if (!session && isProtected(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user visiting an admin path → check role
  if (session && isAdminPath(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    const role = profile?.role as string | undefined;

    // Officers may access specific admin sub-paths (e.g. cage detail pages).
    if (role === "officer" && isOfficerAccessiblePath(pathname)) {
      return response;
    }

    if (!profile || !ADMIN_ROLES.includes(role ?? "")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static (static files)
     *  - _next/image (image optimisation)
     *  - favicon.ico
     *  - public assets (*.png, *.svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
