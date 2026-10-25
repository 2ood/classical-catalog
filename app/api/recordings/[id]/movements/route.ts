import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saveWorkMovements } from "@/lib/movement-store";
import {
  parseMovementRows,
  parseSeconds,
  parseTrackUrl,
} from "@/lib/movements";
import { UUID } from "@/lib/recordings";
import { recordings } from "@/lib/schema";

const badRequest = (error: string) =>
  NextResponse.json({ error }, { status: 400 });

/**
 * Body `{ movements: [{ id?, name, mark }] }`, where `mark` is a start in
 * seconds (YouTube) or a Spotify track URL: updates the work's movement list
 * and this recording's starts together.
 */
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/recordings/[id]/movements">,
) {
  const { id } = await params;
  if (!UUID.test(id)) return badRequest("Invalid recording id");

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.movements)) {
    return badRequest("Expected a list of movements");
  }

  const result = await db.transaction(async (tx) => {
    const [recording] = await tx
      .select({ workId: recordings.workId, mediaType: recordings.mediaType })
      .from(recordings)
      .where(eq(recordings.id, id));
    if (!recording?.workId) return { status: 404 as const };

    const parseMark =
      recording.mediaType === "youtube" ? parseSeconds : parseTrackUrl;
    const rows = parseMovementRows<number | string>(body.movements, parseMark);
    if (!rows.ok) return { status: 400 as const, error: rows.error };

    const movementStarts = await saveWorkMovements(
      tx,
      recording.workId,
      rows.value,
    );
    await tx
      .update(recordings)
      .set({ movementStarts })
      .where(eq(recordings.id, id));
    return { status: 200 as const, movementStarts };
  });

  if (result.status === 404) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }
  if (result.status === 400) return badRequest(result.error);
  return NextResponse.json({ movementStarts: result.movementStarts });
}
