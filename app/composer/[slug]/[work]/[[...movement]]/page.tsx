import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import PlayerSync from "@/components/PlayerSync";
import RecordingsPane from "@/components/RecordingsPane";
import ScorePane from "@/components/ScorePane";
import WorkMovementNav from "@/components/WorkMovementNav";
import { db } from "@/lib/db";
import { composers, recordings, scores, works } from "@/lib/schema";
import { imslpSearchUrl } from "@/lib/scores";
import { movementSlugs } from "@/lib/slugs";
import { searchQuery } from "@/lib/suggestions";

type Route = "/composer/[slug]/[work]/[[...movement]]";

export default function WorkPage({ params }: PageProps<Route>) {
  return (
    // Full viewport minus the 3rem header in the root layout.
    <main className="h-[calc(100dvh-3rem)] flex flex-col">
      <Suspense fallback={<p className="p-6 text-muted">Loading…</p>}>
        <Player params={params} />
      </Suspense>
    </main>
  );
}

async function Player({ params }: Pick<PageProps<Route>, "params">) {
  const { slug, work: workSlug, movement = [] } = await params;

  const [row] = await db
    .select({ work: works, composer: composers })
    .from(works)
    .innerJoin(composers, eq(works.composerId, composers.id))
    .where(and(eq(composers.slug, slug), eq(works.slug, workSlug)));
  if (!row || movement.length > 1) notFound();
  const { work, composer } = row;
  const id = work.id;
  const workPath = `/composer/${composer.slug}/${work.slug}`;

  // Opened at a movement, e.g. from the works list. A movement renamed or
  // moved since the link was made falls back to the work.
  let initialMovement: string | undefined;
  if (movement.length === 1) {
    const index = movementSlugs(work.movements).indexOf(movement[0]);
    if (index === -1) redirect(workPath);
    initialMovement = work.movements[index].id;
  }

  const recs = await db
    .select()
    .from(recordings)
    .where(eq(recordings.workId, id))
    .orderBy(asc(recordings.createdAt));
  const scoreRows = await db
    .select({
      id: scores.id,
      label: scores.label,
      movementPages: scores.movementPages,
    })
    .from(scores)
    .where(eq(scores.workId, id))
    .orderBy(asc(scores.uploadedAt));

  return (
    <PlayerSync
      key={initialMovement}
      movements={work.movements}
      initialMovement={initialMovement}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3 border-b border-border">
        <Link
          href={`/composer/${composer.slug}`}
          aria-label={`Back to ${composer.name}`}
          className="text-muted hover:text-text"
        >
          ←
        </Link>
        <h1 className="text-lg">
          <span className="text-muted">{work.catalogueNum}</span> {work.title}
          {work.key && `, ${work.key}`}
        </h1>
        <WorkMovementNav />
        <span className="ml-auto text-xs text-muted">{composer.name}</span>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-2 divide-x divide-border">
        <ScorePane
          workId={work.id}
          scores={scoreRows}
          imslpUrl={imslpSearchUrl({ ...work, composer: composer.name })}
        />
        <RecordingsPane
          workId={work.id}
          recordings={recs}
          query={searchQuery(composer, work)}
        />
      </div>
    </PlayerSync>
  );
}
