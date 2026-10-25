import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractSpotifyId } from "@/lib/media";
import { UUID } from "@/lib/recordings";
import { recordings } from "@/lib/schema";
import { playRequest, spotifyUri, type PlayBody } from "@/lib/spotify";
import { SpotifyNotConnected, type SpotifyClient } from "@/lib/spotify-client";
import { fetchAlbum, findWork } from "@/lib/spotify-routes";
import { spotify } from "@/lib/spotify-server";
import { recordingPreview, workTrack } from "@/lib/suggestions";

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

/**
 * Body `{ recordingId, movementId? }`: plays the recording on the owner's
 * Spotify, from the movement's track when one is given and linked.
 * Body `{ resume: true }` continues whatever is paused.
 * Body `{ workId, album }` plays a suggested album from the work's first
 * track.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.resume === true) return resume();
  if (body?.album !== undefined) return playAlbum(body);
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
  // Where to start: the movement's track, a single piece inside an album
  // saved whole, or the recording's own track — always inside its album:
  // an idle Spotify accepts a request for a bare track (204) but doesn't
  // play it, while album + offset plays.
  let start: { track: string; album: string | null } | null = null;
  if (typeof track === "string") {
    start = { track, album: await trackAlbum(client, track) };
  } else {
    const piece = await pieceTrack(
      client,
      recording.workId,
      recording.mediaUrl,
    );
    if (piece) {
      start = { track: piece, album: spotifyUri(recording.mediaUrl) };
    } else if (extractSpotifyId(recording.mediaUrl)?.type === "track") {
      start = {
        track: recording.mediaUrl,
        album: await trackAlbum(client, recording.mediaUrl),
      };
    }
  }
  const play = playRequest(recording.mediaUrl, start);
  if (!play) return fail("The recording link is not a Spotify link", 400);
  return send(client, play);
}

/**
 * For a work without movements whose recording is a whole album: the
 * album's track that is the work, if Spotify's track names tell.
 */
async function pieceTrack(
  client: SpotifyClient,
  workId: string | null,
  recordingUrl: string,
): Promise<string | null> {
  const link = extractSpotifyId(recordingUrl);
  if (link?.type !== "album" || !workId) return null;
  try {
    const row = await findWork(workId);
    if (!row || row.work.movements.length > 0) return null;
    const { tracks } = await fetchAlbum(client, link.id);
    return workTrack(tracks, row.work);
  } catch {
    return null; // play the album as it is
  }
}

/** The spotify: URI of the album a track link belongs to, if Spotify says. */
async function trackAlbum(client: SpotifyClient, trackUrl: string) {
  const id = extractSpotifyId(trackUrl)?.id;
  if (!id) return null;
  const res = await client.api(`/tracks/${id}`).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json())?.album?.uri as string | undefined) ?? null;
}

async function playAlbum(body: { workId?: unknown; album?: unknown }) {
  const workId = String(body.workId ?? "");
  if (!UUID.test(workId)) return fail("Invalid work id", 400);
  const link = extractSpotifyId(String(body.album ?? ""));
  if (link?.type !== "album") return fail("Not a Spotify album link", 400);

  const client = spotify();
  if (!client) return fail("Spotify is not set up", 409);
  try {
    const row = await findWork(workId);
    if (!row) return fail("Work not found", 404);
    const { album, tracks } = await fetchAlbum(client, link.id);
    // The work's own tracks come first; else the album's first track.
    const [first] = recordingPreview(
      album,
      tracks,
      row.composer,
      row.work,
    ).tracks;
    const start = first && spotifyUri(first.url);
    return send(client, {
      context_uri: `spotify:album:${link.id}`,
      ...(start && { offset: { uri: start } }),
    });
  } catch (error) {
    if (error instanceof SpotifyNotConnected) {
      return fail("Connect Spotify first", 409);
    }
    throw error;
  }
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
