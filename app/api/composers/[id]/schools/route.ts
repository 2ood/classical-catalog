import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saveSchools } from "@/lib/import-store";
import { UUID } from "@/lib/recordings";
import { composers } from "@/lib/schema";
import { parseSchools } from "@/lib/schools";

/** Body `{ schools: string[] }`: replaces the composer's schools. */
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/composers/[id]/schools">,
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid composer id" }, { status: 400 });
  }
  const parsed = parseSchools(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [composer] = await db
    .select({ id: composers.id })
    .from(composers)
    .where(eq(composers.id, id));
  if (!composer) {
    return NextResponse.json({ error: "Composer not found" }, { status: 404 });
  }
  await saveSchools(id, parsed.value);
  return NextResponse.json({ schools: parsed.value });
}
