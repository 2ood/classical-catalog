import { NextResponse } from "next/server";
import { authorizeUrl, createVerifier, pkceChallenge } from "@/lib/spotify";
import { spotifyRedirectUri } from "@/lib/spotify-server";

/** Starts the Spotify login; `?returnTo=/path` is where to land afterwards. */
export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Set SPOTIFY_CLIENT_ID in .env and restart the server" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const redirectUri = new URL(spotifyRedirectUri());
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  // The login cookie must live on the redirect URI's host (127.0.0.1, since
  // Spotify rejects "localhost"), so start the login there. The Host header
  // is what the browser used; request.url can carry an internal host.
  const host = request.headers.get("host") ?? url.host;
  if (host !== redirectUri.host) {
    const there = new URL("/api/spotify/login", redirectUri);
    there.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(there);
  }

  const verifier = createVerifier();
  const state = createVerifier();
  const res = NextResponse.redirect(
    authorizeUrl({
      clientId,
      redirectUri: redirectUri.toString(),
      state,
      challenge: await pkceChallenge(verifier),
    }),
  );
  res.cookies.set(
    "spotify_login",
    JSON.stringify({
      state,
      verifier,
      returnTo: returnTo.startsWith("/") ? returnTo : "/",
    }),
    { httpOnly: true, sameSite: "lax", path: "/api/spotify", maxAge: 600 },
  );
  return res;
}
