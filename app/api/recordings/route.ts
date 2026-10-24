import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { parseRecordingInput } from "@/lib/recordings";
import { recordings, works } from "@/lib/schema";
import { isSessionValid, SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (!(await isSessionValid(request.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
