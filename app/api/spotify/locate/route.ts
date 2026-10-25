import { and, eq, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pathForTrack } from "@/lib/locate";
import { composers, recordings, works } from "@/lib/schema";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

/**
 * `?track=&album=`: the page of the playing Spotify track — the work at the
 * track's movement, or the work whose recording is the track or its album.
 * `{ path }`, null when no recording has it.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const track = params.get("track") ?? "";
  const album = params.get("album");
  if (!SPOTIFY_ID.test(track) || (album !== null && !SPOTIFY_ID.test(album))) {
    return NextResponse.json({ error: "Invalid Spotify id" }, { status: 400 });
  }

  // Ids are checked above, so they can't carry LIKE wildcards.
  const mentions = (id: string) =>
    or(
      sql`${recordings.movementStarts}::text like ${`%${id}%`}`,
      sql`${recordings.mediaUrl} like ${`%${id}%`}`,
    );
  const candidates = await db
    .select({
      composerSlug: composers.slug,
      workSlug: works.slug,
      movements: works.movements,
      movementStarts: recordings.movementStarts,
      mediaUrl: recordings.mediaUrl,
    })
    .from(recordings)
    .innerJoin(works, eq(recordings.workId, works.id))
    .innerJoin(composers, eq(works.composerId, composers.id))
    .where(
      and(
        eq(recordings.mediaType, "spotify"),
        album ? or(mentions(track), mentions(album)) : mentions(track),
      ),
    );
  return NextResponse.json({ path: pathForTrack(candidates, track, album) });
}
