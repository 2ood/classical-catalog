import { NextResponse } from "next/server";
import { checkCredentials } from "@/lib/auth";
import {
  sealSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");

  if (!(await checkCredentials(username, password))) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(
    SESSION_COOKIE,
    await sealSession({ loggedIn: true }),
    sessionCookieOptions,
  );
  return res;
}
