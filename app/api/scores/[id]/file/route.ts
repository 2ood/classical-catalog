import { eq } from "drizzle-orm";
import fs from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UUID } from "@/lib/recordings";
import { scores } from "@/lib/schema";
import { scoreFilePath } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/scores/[id]/file">,
) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid score id" }, { status: 400 });
  }

  const [score] = await db
    .select({ fileName: scores.fileName })
    .from(scores)
    .where(eq(scores.id, id));
  const filePath = score && scoreFilePath(score.fileName);
  const stat = filePath && (await fs.promises.stat(filePath).catch(() => null));
  if (!stat) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }

  const stream = Readable.toWeb(
    fs.createReadStream(filePath),
  ) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(stat.size),
      // File names are generated per upload, so the content never changes.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
