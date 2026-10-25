import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { UUID } from "@/lib/recordings";
import { recordings } from "@/lib/schema";
import { isSessionValid, SESSION_COOKIE } from "@/lib/session";

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext<"/api/recordings/[id]">,
) {
  if (!(await isSessionValid(request.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
