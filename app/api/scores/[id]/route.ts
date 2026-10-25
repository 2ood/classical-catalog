import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { deleteBlob } from "@/lib/blob";
import { db } from "@/lib/db";
import { UUID } from "@/lib/recordings";
import { scores } from "@/lib/schema";
import { isSessionValid, SESSION_COOKIE } from "@/lib/session";

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext<"/api/scores/[id]">,
) {
  if (!(await isSessionValid(request.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid score id" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(scores)
    .where(eq(scores.id, id))
    .returning({ blobUrl: scores.blobUrl });
  if (!deleted) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }

  // The record is gone either way; a failed file delete only leaves an
  // orphaned blob, so log it rather than fail the request.
  await deleteBlob(deleted.blobUrl).catch((error) =>
    console.error("Failed to delete score blob", deleted.blobUrl, error),
  );
  return new NextResponse(null, { status: 204 });
}
