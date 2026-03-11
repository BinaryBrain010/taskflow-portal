import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

const LOGIN_PATH = "/login";
const ADMIN_PREFIX = "/admin";
const FEED_PATH = "/feed";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (pathname === LOGIN_PATH) {
    if (role === "admin") return NextResponse.redirect(new URL(ADMIN_PREFIX, request.url));
    if (role === "worker") return NextResponse.redirect(new URL(FEED_PATH, request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (role !== "admin") return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    return NextResponse.next();
  }

  if (pathname === FEED_PATH || pathname.startsWith(`${FEED_PATH}/`)) {
    if (role !== "worker") return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    return NextResponse.next();
  }

  if (pathname === "/") {
    if (role === "admin") return NextResponse.redirect(new URL(ADMIN_PREFIX, request.url));
    if (role === "worker") return NextResponse.redirect(new URL(FEED_PATH, request.url));
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*", "/feed/:path*"],
};
