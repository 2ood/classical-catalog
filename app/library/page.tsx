import { io } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import ComposerClusters from "@/components/ComposerClusters";
import ComposerTimeline from "@/components/ComposerTimeline";
import LibraryBrowser from "@/components/LibraryBrowser";
import ViewSwitch, { toView } from "@/components/ViewSwitch";
import { byMovement, byPeriod } from "@/lib/clusters";
import { mapComposers } from "@/lib/library";
import { fetchComposers } from "@/lib/openopus";
import { getComposersWithCounts, getImportedComposers } from "@/lib/queries";

export default function LibraryPage({ searchParams }: PageProps<"/library">) {
  return (
    <main className="p-6 w-full max-w-5xl mx-auto">
      <header className="flex items-baseline gap-3 mb-4 max-w-3xl mx-auto">
        <h1 className="text-xl font-serif">Library</h1>
        <span className="text-xs text-muted">Composers from Open Opus</span>
      </header>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Library searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Library({
  searchParams,
}: Pick<PageProps<"/library">, "searchParams">) {
  await connection();
  const params = await searchParams;
  const view = toView(params.view);
  const [catalogue, imported, locals] = await Promise.all([
    fetchComposers().catch((error: Error) => error),
    getImportedComposers(),
    getComposersWithCounts(),
  ]);
  if (catalogue instanceof Error) {
    return (
      <p className="text-muted max-w-3xl mx-auto">
        Couldn&apos;t reach Open Opus ({catalogue.message}).
      </p>
    );
  }

  let content;
  if (view === "default") {
    const byId = new Map(imported.map((c) => [c.openOpusId, c]));
    content = (
      <div className="max-w-3xl mx-auto">
        <LibraryBrowser
          initialQuery={typeof params.q === "string" ? params.q : ""}
          composers={catalogue.map((c) => {
            const local = byId.get(c.openOpusId);
            return {
              ...c,
              imported: local ? { slug: local.slug, works: local.works } : null,
            };
          })}
        />
      </div>
    );
  } else {
    // Every Open Opus composer; those not imported yet are faded.
    const composers = mapComposers(catalogue, locals);
    if (view === "timeline") {
      await io(); // this year, at request time
      content = (
        <ComposerTimeline
          composers={composers}
          era={typeof params.era === "string" ? params.era : null}
          thisYear={new Date().getFullYear()}
          path="/library"
        />
      );
    } else if (view === "periods") {
      content = <ComposerClusters groups={byPeriod(composers)} />;
    } else {
      content = <ComposerClusters groups={byMovement(composers)} />;
    }
  }

  return (
    <>
      <ViewSwitch current={view} path="/library" defaultLabel="List" />
      {content}
    </>
  );
}
