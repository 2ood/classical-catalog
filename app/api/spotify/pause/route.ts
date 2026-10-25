import { NextResponse } from "next/server";
import { SpotifyNotConnected } from "@/lib/spotify-client";
import { spotify } from "@/lib/spotify-server";

export async function POST() {
  const client = spotify();
  if (!client) {
    return NextResponse.json(
      { error: "Spotify is not set up" },
      { status: 409 },
    );
  }
  try {
    const res = await client.api("/me/player/pause", { method: "PUT" });
    return res.ok
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(
          { error: `Spotify answered ${res.status}` },
          { status: 502 },
        );
  } catch (error) {
    if (error instanceof SpotifyNotConnected) {
      return NextResponse.json(
        { error: "Connect Spotify first" },
        { status: 409 },
      );
    }
    throw error;
  }
}
