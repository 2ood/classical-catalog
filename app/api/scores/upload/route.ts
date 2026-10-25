import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UUID } from "@/lib/recordings";
import { composers, scores, works } from "@/lib/schema";
import { labelFromFilename, scoreFileName } from "@/lib/scores";
import { deleteScoreFile, isPdf, saveScoreFile } from "@/lib/storage";

const badRequest = (error: string) =>
  NextResponse.json({ error }, { status: 400 });

export async function POST(request: Request) {
  const form = await request.formData();
  const workId = String(form.get("workId") ?? "");
  if (!UUID.test(workId)) return badRequest("Invalid work id");

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return badRequest("A PDF file is required");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) return badRequest("The file is not a PDF");

  const [work] = await db
    .select({ slug: works.slug, composerSlug: composers.slug })
    .from(works)
    .innerJoin(composers, eq(composers.id, works.composerId))
    .where(eq(works.id, workId));
  if (!work) {
    return NextResponse.json({ error: "Work not found" }, { status: 404 });
  }

  const label =
    String(form.get("label") ?? "").trim() || labelFromFilename(file.name);
  // Filed as "<composer>/<work>/<label>.pdf".
  const taken = await db
    .select({ fileName: scores.fileName })
    .from(scores)
    .where(eq(scores.workId, workId));
  const fileName = scoreFileName(
    work.composerSlug,
    work.slug,
    label,
    new Set(taken.map((t) => t.fileName)),
  );
  await saveScoreFile(bytes, fileName);
  try {
    const [score] = await db
      .insert(scores)
      .values({ workId, label, fileName })
      .returning();
    return NextResponse.json(score, { status: 201 });
  } catch (error) {
    await deleteScoreFile(fileName);
    throw error;
  }
}
