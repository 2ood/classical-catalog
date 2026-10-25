import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UUID } from "@/lib/recordings";
import { recordings } from "@/lib/schema";

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
