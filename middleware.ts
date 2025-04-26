import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { extractUserIdFromSharePath } from "./lib/share-service"

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Check if the path is a direct share link
  if (path.startsWith("/share/historialdemilydeuserconId=")) {
    // Extract the user ID from the URL
    const userId = extractUserIdFromSharePath(path)

    if (!userId) {
      // Invalid share link format
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
