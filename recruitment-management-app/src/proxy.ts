import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const adminSession = request.cookies.get("admin_session");
  const userSession = request.cookies.get("user_session");

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!adminSession || adminSession.value !== "authenticated") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (request.nextUrl.pathname.startsWith("/careers")) {
    if (!userSession || userSession.value !== "authenticated") {
      return NextResponse.redirect(new URL("/user-login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/careers/:path*"],
};
