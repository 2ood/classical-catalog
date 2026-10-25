import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UUID } from "@/lib/recordings";
import { composers, recordings, works } from "@/lib/schema";
import { SpotifyNotConnected, type SpotifyClient } from "@/lib/spotify-client";
import { spotify } from "@/lib/spotify-server";
import {
  albumToRecording,
  searchQuery,
  toSuggestions,
  type SpotifyAlbum,
  type SpotifyTrack,
} from "@/lib/suggestions";

const ALBUM_ID = /^[A-Za-z0-9]{22}$/;
// Searched, then ranked by how clearly they name the work; the best shown.
const SEARCHED = 10;
const SHOWN = 5;

const fail = (error: string, status: number, code?: string) =>
  NextResponse.json({ error, code }, { status });

async function findWork(workId: string) {
  const [row] = await db
    .select({ work: works, composer: composers })
    .from(works)
    .innerJoin(composers, eq(works.composerId, composers.id))
    .where(eq(works.id, workId));
  return row ?? null;
}

/** Runs `request` with the Spotify client, answering 409 when it can't. */
async function withSpotify(
  request: (client: SpotifyClient) => Promise<Response>,
) {
  const client = spotify();
  if (!client) return fail("Spotify is not set up", 409, "not-configured");
  try {
    return await request(client);
  } catch (error) {
    if (error instanceof SpotifyNotConnected) {
      return fail("Connect Spotify first", 409, "not-connected");
    }
    throw error;
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Spotify answered ${res.status}`);
  return res.json();
}

/** `?workId=`: Spotify albums that look like recordings of the work. */
export async function GET(request: Request) {
  const workId = new URL(request.url).searchParams.get("workId") ?? "";
  if (!UUID.test(workId)) return fail("Invalid work id", 400);

  return withSpotify(async (client) => {
    const row = await findWork(workId);
    if (!row) return fail("Work not found", 404);
    const q = encodeURIComponent(searchQuery(row.composer, row.work));
    const body = await json<{ albums: { items: SpotifyAlbum[] } }>(
      await client.api(`/search?type=album&limit=${SEARCHED}&q=${q}`),
    );
    return NextResponse.json({
      suggestions: toSuggestions(
        body.albums.items,
        row.composer,
        row.work,
      ).slice(0, SHOWN),
    });
  });
}

/** Body `{ workId, albumId }`: saves the album as a Spotify recording. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const workId = String(body?.workId ?? "");
  const albumId = String(body?.albumId ?? "");
  if (!UUID.test(workId)) return fail("Invalid work id", 400);
  if (!ALBUM_ID.test(albumId)) return fail("Invalid Spotify album id", 400);

  return withSpotify(async (client) => {
    const row = await findWork(workId);
    if (!row) return fail("Work not found", 404);

    const album = await json<
      SpotifyAlbum & { tracks: { items: SpotifyTrack[]; next: string | null } }
    >(await client.api(`/albums/${albumId}`));
    // Albums list 50 tracks at a time.
    const tracks = [...album.tracks.items];
    for (let offset = 50; album.tracks.next && offset < 1000; offset += 50) {
      const page = await json<{ items: SpotifyTrack[]; next: string | null }>(
        await client.api(`/albums/${albumId}/tracks?limit=50&offset=${offset}`),
      );
      tracks.push(...page.items);
      if (!page.next) break;
    }

    const [recording] = await db
      .insert(recordings)
      .values(albumToRecording(album, tracks, row.composer, row.work))
      .returning();
    return NextResponse.json(recording, { status: 201 });
  });
}
