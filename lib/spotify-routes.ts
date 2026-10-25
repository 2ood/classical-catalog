/** Shared by the Spotify routes that look at a work's albums. */
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "./db";
import { composers, works } from "./schema";
import { SpotifyNotConnected, type SpotifyClient } from "./spotify-client";
import { spotify } from "./spotify-server";
import type { SpotifyAlbum, SpotifyTrack } from "./suggestions";

export const fail = (error: string, status: number, code?: string) =>
  NextResponse.json({ error, code }, { status });

/** The work with its composer, or null. */
export async function findWork(workId: string) {
  const [row] = await db
    .select({ work: works, composer: composers })
    .from(works)
    .innerJoin(composers, eq(works.composerId, composers.id))
    .where(eq(works.id, workId));
  return row ?? null;
}

/**
 * Runs `request` with the Spotify client, answering 409 with a `code` the
 * page can act on when Spotify is not set up or not connected.
 */
export async function withSpotify(
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

export async function spotifyJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Spotify answered ${res.status}`);
  return res.json();
}

/** An album with all its tracks (Spotify lists 50 at a time). */
export async function fetchAlbum(client: SpotifyClient, albumId: string) {
  const album = await spotifyJson<
    SpotifyAlbum & { tracks: { items: SpotifyTrack[]; next: string | null } }
  >(await client.api(`/albums/${albumId}`));
  const tracks = [...album.tracks.items];
  for (let offset = 50; album.tracks.next && offset < 1000; offset += 50) {
    const page = await spotifyJson<{
      items: SpotifyTrack[];
      next: string | null;
    }>(await client.api(`/albums/${albumId}/tracks?limit=50&offset=${offset}`));
    tracks.push(...page.items);
    if (!page.next) break;
  }
  return { album, tracks };
}
