import { NextResponse } from "next/server";
import { spotify, spotifyRedirectUri } from "@/lib/spotify-server";

type Login = { state: string; verifier: string; returnTo: string };

function readLogin(request: Request): Login | null {
  const cookie = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith("spotify_login="));
  try {
    return cookie
      ? JSON.parse(decodeURIComponent(cookie.slice("spotify_login=".length)))
      : null;
  } catch {
    return null;
  }
}

/** Spotify sends the browser back here after the owner logs in. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const login = readLogin(request);
  if (!login || login.state !== url.searchParams.get("state")) {
    return NextResponse.json(
      { error: "This Spotify login did not start here; connect again" },
      { status: 400 },
    );
  }

  const done = NextResponse.redirect(new URL(login.returnTo, url));
  done.cookies.delete({ name: "spotify_login", path: "/api/spotify" });
  const code = url.searchParams.get("code");
  if (!code) return done; // declined (?error=access_denied)

  const client = spotify();
  if (!client) {
    return NextResponse.json(
      { error: "Set SPOTIFY_CLIENT_ID in .env" },
      { status: 500 },
    );
  }
  await client.exchangeCode(code, login.verifier, spotifyRedirectUri());
  return done;
}
