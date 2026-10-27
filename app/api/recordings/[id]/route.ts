import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { youTubeStart } from "@/lib/media";
import { parseMovementStarts } from "@/lib/movements";
import { linkPerformers } from "@/lib/performer-store";
import { freeRecordingSlug } from "@/lib/recording-store";
import { parseRecordingInput, UUID } from "@/lib/recordings";
import { recordings, works } from "@/lib/schema";

// parseRecordingInput checks a work id too; an edit keeps the recording's.
const ID_PLACEHOLDER = "00000000-0000-4000-8000-000000000000";

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/recordings/[id]">,
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { error: "Invalid recording id" },
      { status: 400 },
    );
  }

  const [deleted] = await db
    .delete(recordings)
    .where(eq(recordings.id, id))
    .returning({ id: recordings.id });
  if (!deleted) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}

/**
 * Edits a recording: performer, year, link, and (optional) movement starts,
 * start and end. Without movement starts the old ones stay — unless the
 * media type changed, since tracks and times don't carry over; likewise a
 * start or end not sent (and no `t=` in the link) stays, as does the
 * movement it is a recording of.
 */
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/recordings/[id]">,
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { error: "Invalid recording id" },
      { status: 400 },
    );
  }
  const body = await request.json().catch(() => null);
  const parsed = parseRecordingInput({ ...body, workId: ID_PLACEHOLDER });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [existing] = await db
    .select({
      mediaType: recordings.mediaType,
      movementStarts: recordings.movementStarts,
      startSeconds: recordings.startSeconds,
      endSeconds: recordings.endSeconds,
      movementId: recordings.movementId,
      workId: recordings.workId,
      performer: recordings.performer,
      year: recordings.year,
      slug: recordings.slug,
      movements: works.movements,
    })
    .from(recordings)
    .innerJoin(works, eq(recordings.workId, works.id))
    .where(eq(recordings.id, id));
  if (!existing) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  const { mediaType } = parsed.value;
  let movementStarts =
    mediaType === existing.mediaType ? existing.movementStarts : {};
  if (body.movementStarts !== undefined) {
    const starts = parseMovementStarts(
      body.movementStarts,
      mediaType,
      existing.movements.map((m) => m.id),
    );
    if (!starts.ok) {
      return NextResponse.json({ error: starts.error }, { status: 400 });
    }
    movementStarts = starts.value;
  }

  const { performer, year, mediaUrl } = parsed.value;
  const same = mediaType === existing.mediaType;
  const startSeconds =
    same && body.startSeconds === undefined && !youTubeStart(body.mediaUrl)
      ? existing.startSeconds
      : parsed.value.startSeconds;
  const endSeconds =
    same && body.endSeconds === undefined
      ? existing.endSeconds
      : parsed.value.endSeconds;
  const movementId =
    body.movementId === undefined
      ? existing.movementId
      : parsed.value.movementId;
  if (movementId && !existing.movements.some((m) => m.id === movementId)) {
    return NextResponse.json({ error: "Unknown movement" }, { status: 400 });
  }
  // Renamed with its performer or year (links by the old slug stop working).
  const slug =
    performer === existing.performer && year === existing.year
      ? existing.slug
      : await freeRecordingSlug(existing.workId!, performer, year, id);
  const [updated] = await db
    .update(recordings)
    .set({
      performer,
      year,
      mediaType,
      mediaUrl,
      movementStarts,
      startSeconds,
      endSeconds,
      movementId,
      slug,
    })
    .where(eq(recordings.id, id))
    .returning();
  await linkPerformers(db, id, performer);
  return NextResponse.json(updated);
}
