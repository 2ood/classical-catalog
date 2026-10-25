import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import RecordingsPane from "@/components/RecordingsPane";
import ScorePane from "@/components/ScorePane";
import { isLoggedIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { UUID } from "@/lib/recordings";
import { composers, recordings, scores, works } from "@/lib/schema";
import { imslpSearchUrl } from "@/lib/scores";

export default function WorkPage({ params }: PageProps<"/work/[id]">) {
  return (
    // Full viewport minus the 3rem header in the root layout.
    <main className="h-[calc(100dvh-3rem)] flex flex-col">
      <Suspense fallback={<p className="p-6 text-muted">Loading…</p>}>
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
  const scoreRows = await db
    .select({ id: scores.id, label: scores.label, blobUrl: scores.blobUrl })
    .from(scores)
    .where(eq(scores.workId, id))
    .orderBy(asc(scores.uploadedAt));
  const canEdit = await isLoggedIn();

  return (
    <>
      <div className="flex items-baseline gap-3 px-6 py-3 border-b border-border">
        <Link
          href={`/composer/${composer.id}`}
          aria-label={`Back to ${composer.name}`}
          className="text-muted hover:text-text"
        >
          ←
        </Link>
        <h1 className="text-lg">
          <span className="text-muted">{work.catalogueNum}</span> {work.title}
          {work.key && `, ${work.key}`}
        </h1>
        <span className="text-xs text-muted">{composer.name}</span>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-2 divide-x divide-border">
        <ScorePane
          workId={work.id}
          scores={scoreRows}
          canEdit={canEdit}
          imslpUrl={imslpSearchUrl({ ...work, composer: composer.name })}
        />
        <RecordingsPane workId={work.id} recordings={recs} canEdit={canEdit} />
      </div>
    </>
  );
}
