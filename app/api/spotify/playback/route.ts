import { connection, NextResponse } from "next/server";
import { toPlayback, type Playback } from "@/lib/spotify";
import { SpotifyNotConnected } from "@/lib/spotify-client";
import { spotify } from "@/lib/spotify-server";

/** What the owner's Spotify is playing right now. */
export async function GET() {
  // Depends on the stored login and env, never on the build: always run.
  await connection();
  const client = spotify();
  if (!client) return NextResponse.json({ connected: false });
  try {
    const res = await client.api("/me/player");
    if (res.status === 204) {
      return NextResponse.json({ connected: true, state: null });
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Spotify answered ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({
      connected: true,
      state: toPlayback(await res.json()),
    } satisfies Playback);
  } catch (error) {
    if (error instanceof SpotifyNotConnected) {
      return NextResponse.json({ connected: false });
    }
    throw error;
  }
}
