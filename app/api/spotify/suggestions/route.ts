import { NextResponse } from "next/server";
import { UUID } from "@/lib/recordings";
import { fail, findWork, spotifyJson, withSpotify } from "@/lib/spotify-routes";
import {
  searchQuery,
  toSuggestions,
  type SpotifyAlbum,
} from "@/lib/suggestions";

// Searched, then ranked by how clearly they name the work; the best shown.
const SEARCHED = 10;
const SHOWN = 5;

/** `?workId=`: Spotify albums that look like recordings of the work. */
export async function GET(request: Request) {
  const workId = new URL(request.url).searchParams.get("workId") ?? "";
  if (!UUID.test(workId)) return fail("Invalid work id", 400);

  return withSpotify(async (client) => {
    const row = await findWork(workId);
    if (!row) return fail("Work not found", 404);
    const q = encodeURIComponent(searchQuery(row.composer, row.work));
    const body = await spotifyJson<{ albums: { items: SpotifyAlbum[] } }>(
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
