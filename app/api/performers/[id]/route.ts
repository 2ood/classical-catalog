import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renamePerformer, updatePerformer } from "@/lib/performer-store";
import { parsePerformerEdit } from "@/lib/performers";
import { UUID } from "@/lib/recordings";
import { performers } from "@/lib/schema";

/**
 * Body `{ name?, kind?, instrument? }`: renames the performer (the old name
 * stays an alias) and/or sets what it is.
 */
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/performers/[id]">,
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { error: "Invalid performer id" },
      { status: 400 },
    );
  }
  const parsed = parsePerformerEdit(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [performer] = await db
    .select({ id: performers.id })
    .from(performers)
    .where(eq(performers.id, id));
  if (!performer) {
    return NextResponse.json({ error: "Performer not found" }, { status: 404 });
  }

  const { name, ...rest } = parsed.value;
  if (name) {
    const renamed = await renamePerformer(db, id, name);
    if (!renamed.ok) {
      return NextResponse.json({ error: renamed.error }, { status: 409 });
    }
  }
  if (Object.keys(rest).length > 0) await updatePerformer(db, id, rest);
  const [updated] = await db
    .select()
    .from(performers)
    .where(eq(performers.id, id));
  return NextResponse.json(updated);
}
