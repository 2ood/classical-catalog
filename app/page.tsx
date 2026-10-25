import { io } from "next/cache";
import { Suspense } from "react";
import ComposerClusters from "@/components/ComposerClusters";
import ComposerCloud from "@/components/ComposerCloud";
import ComposerTimeline from "@/components/ComposerTimeline";
import ViewSwitch, { toView } from "@/components/ViewSwitch";
import { byMovement, byPeriod } from "@/lib/clusters";
import { getComposersWithCounts } from "@/lib/queries";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="flex-1 flex flex-col p-6">
      <h1 className="sr-only">Composers</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Composers searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Composers({
  searchParams,
}: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  const view = toView(params.view);
  const composers = await getComposersWithCounts();
  if (composers.length === 0) {
    return <p className="text-muted">No composers yet.</p>;
  }

  let content;
  if (view === "timeline") {
    await io(); // this year, at request time
    const era = typeof params.era === "string" ? params.era : null;
    content = (
      <ComposerTimeline
        composers={composers}
        era={era}
        thisYear={new Date().getFullYear()}
      />
    );
  } else if (view === "periods") {
    content = <ComposerClusters groups={byPeriod(composers)} />;
  } else if (view === "movements") {
    content = <ComposerClusters groups={byMovement(composers)} />;
  } else {
    // The cloud sits in the middle of the page.
    content = (
      <div className="flex-1 flex flex-col justify-center">
        <ComposerCloud composers={composers} />
      </div>
    );
  }

  return (
    <>
      <ViewSwitch current={view} />
      {content}
    </>
  );
}
