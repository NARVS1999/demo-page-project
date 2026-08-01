// proxy.ts — Next 16 auth guard (NOT middleware.ts; the file name is the convention).
// Single enforcement point for /admin, /dashboard, /posts, and /api/*.
// Rules:
//   - NO `export const runtime` (forbidden in proxy files — throws).
//   - bcryptjs NEVER here (route handlers only — Pitfall 3).
//   - Public auth endpoints are whitelisted BEFORE session verification so the
//     login/register/logout handlers stay reachable without a session.

import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/session";

const PUBLIC_AUTH_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/logout"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.nextUrl.origin;

  // 1. Origin check for state-changing /api/* requests (CSRF hardening — A6).
  //    Runs BEFORE the public-auth whitelist so /api/auth/login, /register and
  //    /logout are covered too (login CSRF, logout CSRF — WR-02). Browsers
  //    always attach Origin on POST, so a MISMATCH (or malformed header) is the
  //    attack signal → 403. Clients without the header (curl, scripts) are not
  //    browser-CSRF vectors and pass through — the plan's manual curl checks
  //    depend on this.
  if (
    pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const header = request.headers.get("origin") ?? request.headers.get("referer");
    if (header) {
      try {
        const headerOrigin = new URL(header).origin;
        if (headerOrigin !== origin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // 2. Whitelist public auth endpoints — reachable without a session.
  if (PUBLIC_AUTH_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // 3. Session check for protected surfaces.
  const session = await verifySession(request.cookies.get("session")?.value);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/posts")
    ) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/dashboard/:path*", "/posts/:path*"],
};
