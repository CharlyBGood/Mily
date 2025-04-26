import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Check if the path is a share link
  if (path.startsWith("/share/") && path.length > 7) {
    // Extract the short ID from the URL
    const shortId = path.substring(7).replace("/", "")

    // Validate the short ID format (alphanumeric, 6-12 chars)
    if (!/^[a-zA-Z0-9]{6,12}$/.test(shortId)) {
      // Invalid short ID format, redirect to home
      return NextResponse.redirect(new URL("/", request.url))
    }

    // Allow the request to proceed - the page component will handle access control
    return NextResponse.next()
  }

  // For all other routes, proceed normally
  return NextResponse.next()
}

export const config = {
  matcher: ["/share/:path*"],
}
