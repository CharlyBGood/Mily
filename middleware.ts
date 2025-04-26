import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Check if the path is a direct share link
  if (path.startsWith("/share/historialdemilydeuserconId=")) {
    // Extract the user ID from the URL
    const userId = path.split("historialdemilydeuserconId=")[1].replace("/", "")

    // Here you could add additional security checks if needed
    // For example, checking if the user has enabled sharing

    // For now, we'll just allow the request to proceed
    return NextResponse.next()
  }

  // For all other routes, proceed normally
  return NextResponse.next()
}

export const config = {
  matcher: ["/share/:path*"],
}
