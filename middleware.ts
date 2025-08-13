import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Handle Supabase session updates
  const response = await updateSession(request)

  // Additional role-based access control
  const pathname = request.nextUrl.pathname

  // Manager-only routes
  if (pathname.startsWith("/dashboard/manager")) {
    // This will be handled by the page components using requireManager()
    return response
  }

  // Salesperson-only routes
  if (pathname.startsWith("/dashboard/salesperson")) {
    // This will be handled by the page components using requireSalesperson()
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
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
