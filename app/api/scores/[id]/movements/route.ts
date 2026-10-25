import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseMovements } from "@/lib/movements";
import { UUID } from "@/lib/recordings";
import { scores } from "@/lib/schema";

/** Replaces a score's movement list: body `{ movements: [{ title, page }] }`. */
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/scores/[id]/movements">,
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid score id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseMovements(body?.movements);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [updated] = await db
    .update(scores)
    .set({ movements: parsed.value })
    .where(eq(scores.id, id))
    .returning({ movements: scores.movements });
  if (!updated) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
