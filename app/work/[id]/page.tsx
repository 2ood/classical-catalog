import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AddRecordingForm from "@/components/AddRecordingForm";
import RecordingsPane from "@/components/RecordingsPane";
import { isLoggedIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { UUID } from "@/lib/recordings";
import { composers, recordings, works } from "@/lib/schema";

export default function WorkPage({ params }: PageProps<"/work/[id]">) {
  return (
    <main className="p-6 flex-1 flex flex-col">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Player params={params} />
      </Suspense>
    </main>
  );
}

async function Player({ params }: Pick<PageProps<"/work/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [row] = await db
    .select({ work: works, composer: composers })
    .from(works)
    .innerJoin(composers, eq(works.composerId, composers.id))
    .where(eq(works.id, id));
  if (!row) notFound();
  const { work, composer } = row;

  const recs = await db
    .select()
    .from(recordings)
    .where(eq(recordings.workId, id))
    .orderBy(asc(recordings.createdAt));

  return (
    <>
      <Link
        href={`/composer/${composer.id}`}
        className="text-sm text-muted hover:text-text"
      >
        ← {composer.name}
      </Link>
      <h1 className="text-xl mt-2 mb-4">
        <span className="text-muted">{work.catalogueNum}</span> {work.title}
      </h1>
      <RecordingsPane recordings={recs} />
      <Suspense>
        <AddRecordingSlot workId={work.id} />
      </Suspense>
    </>
  );
}

async function AddRecordingSlot({ workId }: { workId: string }) {
  if (!(await isLoggedIn())) return null;
  return <AddRecordingForm workId={workId} />;
}
