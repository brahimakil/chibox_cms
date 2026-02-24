import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "chihelo-cms-secret-key-change-in-production-2026"
);

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth/login", "/api/auth/signup"];

// Route-prefix → required permission (checked server-side)
const ROUTE_PERMISSIONS: Record<string, string> = {
  "/dashboard/tryon-prompts": "page.tryon_prompts",
  "/dashboard/tryon-analytics": "page.tryon_analytics",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    // If already logged in and hitting /login or /signup, redirect to dashboard
    if (pathname === "/login" || pathname === "/signup") {
      const token = request.cookies.get("cms_session")?.value;
      if (token) {
        try {
          await jwtVerify(token, JWT_SECRET);
          return NextResponse.redirect(new URL("/dashboard/items", request.url));
        } catch {
          // Token invalid, let them login
        }
      }
    }
    return NextResponse.next();
  }

  // Allow static assets & Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check auth for all other routes
  const token = request.cookies.get("cms_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const perms = (payload.permissions as string[]) || [];

    // If hitting /dashboard exactly and user lacks page.dashboard, send to /dashboard/items
    if (pathname === "/dashboard" && !perms.includes("page.dashboard")) {
      return NextResponse.redirect(new URL("/dashboard/items", request.url));
    }

    // Check route-level permissions
    for (const [route, requiredPerm] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(route)) {
        if (!perms.includes(requiredPerm)) {
          // Redirect unauthorized users to items list (safe default)
          return NextResponse.redirect(new URL("/dashboard/items", request.url));
        }
        break;
      }
    }

    return NextResponse.next();
  } catch {
    // Token expired or invalid
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("cms_session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
