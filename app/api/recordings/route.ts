import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseRecordingInput } from "@/lib/recordings";
import { recordings, works } from "@/lib/schema";

export async function POST(request: Request) {
  const parsed = parseRecordingInput(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [work] = await db
    .select({ id: works.id })
    .from(works)
    .where(eq(works.id, parsed.value.workId));
  if (!work) {
    return NextResponse.json({ error: "Work not found" }, { status: 404 });
  }

  const [recording] = await db
    .insert(recordings)
    .values(parsed.value)
    .returning();
  return NextResponse.json(recording, { status: 201 });
}
