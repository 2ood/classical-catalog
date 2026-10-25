import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovementStarts } from "@/lib/movements";
import { linkPerformers } from "@/lib/performer-store";
import { parseRecordingInput } from "@/lib/recordings";
import { recordings, works } from "@/lib/schema";

/**
 * Adds a recording; `movementStarts` (`{ movementId: track or seconds }`,
 * optional) saves where each of the work's movements starts in one go.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseRecordingInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [work] = await db
    .select({ id: works.id, movements: works.movements })
    .from(works)
    .where(eq(works.id, parsed.value.workId));
  if (!work) {
    return NextResponse.json({ error: "Work not found" }, { status: 404 });
  }
  const starts = parseMovementStarts(
    body.movementStarts,
    parsed.value.mediaType,
    work.movements.map((m) => m.id),
  );
  if (!starts.ok) {
    return NextResponse.json({ error: starts.error }, { status: 400 });
  }

  const [recording] = await db
    .insert(recordings)
    .values({ ...parsed.value, movementStarts: starts.value })
    .returning();
  await linkPerformers(db, recording.id, recording.performer);
  return NextResponse.json(recording, { status: 201 });
}
