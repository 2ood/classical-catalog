import { NextResponse } from "next/server";
import { extractSpotifyId } from "@/lib/media";
import { UUID } from "@/lib/recordings";
import {
  fail,
  fetchAlbum,
  findWork,
  spotifyJson,
  withSpotify,
} from "@/lib/spotify-routes";
import { recordingPreview, type RecordingPreview } from "@/lib/suggestions";

/**
 * `?workId=&url=`: what adding this Spotify album (or a track of it) as a
 * recording of the work would save: performers, year, link, and the
 * album's tracks matched to the work's movements. A track link for a work
 * without movements stays a track recording.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const workId = params.get("workId") ?? "";
  if (!UUID.test(workId)) return fail("Invalid work id", 400);
  const link = extractSpotifyId(params.get("url") ?? "");
  if (link?.type !== "album" && link?.type !== "track") {
    return fail("Paste a Spotify album or track link", 400);
  }

  return withSpotify(async (client) => {
    const row = await findWork(workId);
    if (!row) return fail("Work not found", 404);

    let albumId = link.id;
    if (link.type === "track") {
      const track = await spotifyJson<{ album: { id: string } }>(
        await client.api(`/tracks/${link.id}`),
      );
      albumId = track.album.id;
    }
    const { album, tracks } = await fetchAlbum(client, albumId);
    const preview = recordingPreview(album, tracks, row.composer, row.work);

    if (link.type === "track" && row.work.movements.length < 2) {
      const single: RecordingPreview = {
        ...preview,
        mediaUrl: `https://open.spotify.com/track/${link.id}`,
        tracks: [],
        movementStarts: {},
      };
      return NextResponse.json(single);
    }
    return NextResponse.json(preview);
  });
}
