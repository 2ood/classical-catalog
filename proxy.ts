import { NextResponse, type NextRequest } from "next/server";
import { isSessionValid, SESSION_COOKIE } from "./lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = await isSessionValid(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname.startsWith("/admin") && !loggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isMutatingApi =
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (isMutatingApi && !loggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
