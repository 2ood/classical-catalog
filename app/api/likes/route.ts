import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseLike } from "@/lib/likes";
import { likedTracks, recordings, works } from "@/lib/schema";

/**
 * Body `{ recordingId, movementId?, liked }`: likes or unlikes a movement
 * of a recording (or, without a movement, the recording's piece).
 */
export async function PUT(request: Request) {
  const parsed = parseLike(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { recordingId, movementId, liked } = parsed.value;

  const [found] = await db
    .select({ movements: works.movements })
    .from(recordings)
    .innerJoin(works, eq(works.id, recordings.workId))
    .where(eq(recordings.id, recordingId));
  if (!found) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
  if (movementId && !found.movements.some((m) => m.id === movementId)) {
    return NextResponse.json({ error: "Unknown movement" }, { status: 400 });
  }

  if (liked) {
    await db
      .insert(likedTracks)
      .values({ recordingId, movementId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(likedTracks)
      .where(
        and(
          eq(likedTracks.recordingId, recordingId),
          eq(likedTracks.movementId, movementId),
        ),
      );
  }
  return NextResponse.json({ liked });
}
