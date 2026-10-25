import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractSpotifyId } from "@/lib/media";
import { UUID } from "@/lib/recordings";
import { recordings } from "@/lib/schema";
import { playRequest, type PlayBody } from "@/lib/spotify";
import { SpotifyNotConnected, type SpotifyClient } from "@/lib/spotify-client";
import { spotify } from "@/lib/spotify-server";

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

/**
 * Body `{ recordingId, movementId? }`: plays the recording on the owner's
 * Spotify, from the movement's track when one is given and linked.
 * Body `{ resume: true }` continues whatever is paused.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.resume === true) return resume();
  const recordingId = String(body?.recordingId ?? "");
  if (!UUID.test(recordingId)) return fail("Invalid recording id", 400);

  const client = spotify();
  if (!client) return fail("Spotify is not set up", 409);

  const [recording] = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, recordingId));
  if (!recording || recording.mediaType !== "spotify") {
    return fail("Spotify recording not found", 404);
  }
  const track = body?.movementId
    ? recording.movementStarts[String(body.movementId)]
    : null;
  const play = playRequest(
    recording.mediaUrl,
    typeof track === "string"
      ? { track, album: await trackAlbum(client, track) }
      : null,
  );
  if (!play) return fail("The recording link is not a Spotify link", 400);
  return send(client, play);
}

/** The spotify: URI of the album a track link belongs to, if Spotify says. */
async function trackAlbum(client: SpotifyClient, trackUrl: string) {
  const id = extractSpotifyId(trackUrl)?.id;
  if (!id) return null;
  const res = await client.api(`/tracks/${id}`).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json())?.album?.uri as string | undefined) ?? null;
}

async function resume() {
  const client = spotify();
  if (!client) return fail("Spotify is not set up", 409);
  return send(client, null);
}

/** PUT /me/player/play on the active (or first available) device. */
async function send(client: SpotifyClient, play: PlayBody | null) {
  try {
    // Play on the active device, or wake the first available one.
    const devices = (await (await client.api("/me/player/devices")).json())
      .devices as { id: string; is_active: boolean }[];
    const device = devices.find((d) => d.is_active) ?? devices[0];
    if (!device) {
      return fail("Open Spotify on one of your devices, then try again", 409);
    }
    const res = await client.api(
      `/me/player/play?device_id=${encodeURIComponent(device.id)}`,
      play
        ? {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(play),
          }
        : { method: "PUT" },
    );
    if (!res.ok) {
      const message = (await res.json().catch(() => null))?.error?.message;
      return fail(message ?? `Spotify answered ${res.status}`, 502);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof SpotifyNotConnected) {
      return fail("Connect Spotify first", 409);
    }
    throw error;
  }
}
