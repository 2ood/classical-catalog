import { connection, NextResponse } from "next/server";
import type { Playback } from "@/lib/spotify";
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
    const body = await res.json();
    const item = body.item;
    return NextResponse.json({
      connected: true,
      state: {
        isPlaying: Boolean(body.is_playing),
        progressMs: body.progress_ms ?? 0,
        device: body.device?.name ?? null,
        track: item
          ? {
              id: item.id,
              name: item.name,
              artists: (item.artists ?? [])
                .map((a: { name: string }) => a.name)
                .join(", "),
            }
          : null,
      },
    } satisfies Playback);
  } catch (error) {
    if (error instanceof SpotifyNotConnected) {
      return NextResponse.json({ connected: false });
    }
    throw error;
  }
}
