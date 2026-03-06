import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ["/login", "/signup", "/"];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isApiAuth = pathname.startsWith("/api/auth");
  const isApi = pathname.startsWith("/api");

  // Allow API auth routes
  if (isApiAuth) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!token && !isPublicRoute && !isApi) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if (token && (pathname === "/login" || pathname === "/signup")) {
    if (token.status === "ONBOARDING") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    if (token.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Route users based on status
  if (token) {
    const isOnboarding = pathname.startsWith("/onboarding");
    const isDashboard = pathname.startsWith("/dashboard");
    const isAdmin = pathname.startsWith("/admin");

    // ONBOARDING status → force to onboarding flow
    if (token.status === "ONBOARDING" && !isOnboarding && !isApi) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // Completed onboarding → redirect away from onboarding
    // Exception: allow /onboarding/success for users who just paid
    const isOnboardingSuccess = pathname === "/onboarding/success";
    if (token.status !== "ONBOARDING" && isOnboarding && !isOnboardingSuccess) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Admin routes → only for ADMIN role
    if (isAdmin && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // PENDING_SETUP → allow dashboard but show setup pending state
    // ACTIVE, PAUSED → normal dashboard access
    // SUSPENDED → allow dashboard but show payment required
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
