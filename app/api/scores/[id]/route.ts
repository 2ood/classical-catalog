import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UUID } from "@/lib/recordings";
import { scores } from "@/lib/schema";
import { deleteScoreFile } from "@/lib/storage";

export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/scores/[id]">,
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid score id" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(scores)
    .where(eq(scores.id, id))
    .returning({ fileName: scores.fileName });
  if (!deleted) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }
  await deleteScoreFile(deleted.fileName);
  return new NextResponse(null, { status: 204 });
}
