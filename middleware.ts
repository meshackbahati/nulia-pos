import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Skip middleware for static files and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return response
  }

  // Redirect root to login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // Protected dashboard routes - let page components handle detailed auth
  if (pathname.startsWith("/dashboard")) {
    // Check if user is trying to access wrong dashboard
    if (pathname.startsWith("/dashboard/manager")) {
      // Manager dashboard access will be verified by requireManager() in the page
      console.log("[v0] Manager dashboard access attempt")
    } else if (pathname.startsWith("/dashboard/salesperson")) {
      // Salesperson dashboard access will be verified by requireSalesperson() in the page
      console.log("[v0] Salesperson dashboard access attempt")
    }
  }

  // Allow auth routes
  if (pathname.startsWith("/auth")) {
    return response
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - API routes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
