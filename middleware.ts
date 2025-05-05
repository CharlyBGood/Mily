import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // For all routes, proceed normally
  return NextResponse.next()
}

export const config = {
  matcher: ["/share/:path*"],
}
