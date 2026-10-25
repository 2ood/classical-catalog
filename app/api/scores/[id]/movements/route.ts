import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saveWorkMovements } from "@/lib/movement-store";
import { parseMovementRows, parsePage } from "@/lib/movements";
import { UUID } from "@/lib/recordings";
import { scores } from "@/lib/schema";

/**
 * Body `{ movements: [{ id?, name, mark: page | null }] }`: updates the work's
 * movement list and this score's start pages together.
 */
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/scores/[id]/movements">,
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid score id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const rows = parseMovementRows(body?.movements, parsePage);
  if (!rows.ok) {
    return NextResponse.json({ error: rows.error }, { status: 400 });
  }

  const saved = await db.transaction(async (tx) => {
    const [score] = await tx
      .select({ workId: scores.workId })
      .from(scores)
      .where(eq(scores.id, id));
    if (!score?.workId) return null;
    const movementPages = await saveWorkMovements(tx, score.workId, rows.value);
    await tx.update(scores).set({ movementPages }).where(eq(scores.id, id));
    return movementPages;
  });
  if (!saved) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }
  return NextResponse.json({ movementPages: saved });
}
