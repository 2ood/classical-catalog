import { NextResponse } from "next/server";
import { libraryRequest } from "@/lib/spotify";
import type { SpotifyClient } from "@/lib/spotify-client";
import { fail, withSpotify } from "@/lib/spotify-routes";

/**
 * Logins from before liking existed lack Spotify's library scopes; Spotify
 * answers 403, and the player offers to connect again.
 */
const needsReconnect = () =>
  fail("Connect Spotify again to like tracks", 409, "needs-reconnect");

async function send(client: SpotifyClient, path: string, method: string) {
  return client.api(path, { method });
}

/** `?track=`: is the track in the owner's Spotify library? `{ liked }` */
export async function GET(request: Request) {
  const track = new URL(request.url).searchParams.get("track") ?? "";
  const call = libraryRequest(track, null);
  if (!call) return fail("Invalid track id", 400);

  return withSpotify(async (client) => {
    const res = await send(client, call.path, call.method);
    if (res.status === 403) return needsReconnect();
    if (!res.ok) return fail(`Spotify answered ${res.status}`, 502);
    const [liked] = (await res.json()) as boolean[];
    return NextResponse.json({ liked: Boolean(liked) });
  });
}

/** Body `{ track, liked }`: likes or unlikes the track on Spotify. */
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.liked !== "boolean") {
    return fail("Say whether to like or unlike", 400);
  }
  const call = libraryRequest(String(body.track ?? ""), body.liked);
  if (!call) return fail("Invalid track id", 400);

  return withSpotify(async (client) => {
    const res = await send(client, call.path, call.method);
    if (res.status === 403) return needsReconnect();
    if (!res.ok) return fail(`Spotify answered ${res.status}`, 502);
    return NextResponse.json({ liked: body.liked });
  });
}
