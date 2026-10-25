import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mergePerformers } from "@/lib/performer-store";
import { UUID } from "@/lib/recordings";
import { performers } from "@/lib/schema";

/**
 * Body `{ into }`: merges this performer into another — its names become
 * the other's aliases and its recordings move over. Answers `{ slug }` of
 * the performer that remains.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/performers/[id]/merge">,
) {
  const { id } = await params;
  const into = String((await request.json().catch(() => null))?.into ?? "");
  if (!UUID.test(id) || !UUID.test(into) || id === into) {
    return NextResponse.json(
      { error: "Choose another performer to merge into" },
      { status: 400 },
    );
  }

  const found = await db
    .select({ id: performers.id, slug: performers.slug })
    .from(performers)
    .where(inArray(performers.id, [id, into]));
  const target = found.find((p) => p.id === into);
  if (found.length !== 2 || !target) {
    return NextResponse.json({ error: "Performer not found" }, { status: 404 });
  }
  await mergePerformers(db, id, into);
  return NextResponse.json({ slug: target.slug });
}
