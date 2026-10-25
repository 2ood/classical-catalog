import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PerformerEditor from "@/components/PerformerEditor";
import { getPerformer, getPerformers } from "@/lib/queries";
import { orderForQueue, queueHref } from "@/lib/queue";

export default function PerformerPage({
  params,
}: PageProps<"/performer/[slug]">) {
  return (
    <main className="p-6 w-full max-w-3xl mx-auto">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Performer params={params} />
      </Suspense>
    </main>
  );
}

async function Performer({
  params,
}: Pick<PageProps<"/performer/[slug]">, "params">) {
  const { slug } = await params;
  const [found, all] = await Promise.all([getPerformer(slug), getPerformers()]);
  if (!found) notFound();
  const { performer, aliases, recordings } = found;

  // By composer (in birth order), then catalogue number: also the order
  // "Play all" plays them in.
  const ordered = orderForQueue(recordings);
  const byComposer = new Map<string, typeof recordings>();
  for (const r of ordered) {
    byComposer.set(r.composer.slug, [
      ...(byComposer.get(r.composer.slug) ?? []),
      r,
    ]);
  }

  return (
    <>
      <header className="flex items-baseline gap-3 mb-2">
        <Link
          href="/performers"
          aria-label="Back to performers"
          className="text-muted hover:text-text"
        >
          ←
        </Link>
        <h1 className="text-xl font-serif">{performer.name}</h1>
        <span className="text-xs text-muted">
          {[performer.kind, performer.instrument].filter(Boolean).join(" · ")}
        </span>
        {ordered.length > 0 && (
          <Link
            href={queueHref(ordered[0], performer.slug, 0)}
            className="ml-auto text-sm px-3 py-1 bg-inverse-bg text-inverse-text hover:bg-[#333]"
          >
            ▶ Play all
          </Link>
        )}
      </header>
      {aliases.length > 0 && (
        <p className="text-sm text-muted mb-4">Also: {aliases.join(", ")}</p>
      )}
      <div className="mb-6">
        <PerformerEditor
          key={`${performer.name}-${performer.kind}-${performer.instrument}`}
          performer={performer}
          others={all
            .filter((p) => p.id !== performer.id)
            .map(({ id, name }) => ({ id, name }))}
        />
      </div>
      {recordings.length === 0 ? (
        <p className="text-muted">No recordings.</p>
      ) : (
        [...byComposer].map(([composerSlug, recs]) => (
          <section key={composerSlug} className="mb-6">
            <h2 className="text-xs uppercase text-muted border-t border-border pt-2 mb-1">
              {recs[0].composer.name}
            </h2>
            <ul>
              {recs.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/composer/${composerSlug}/${r.work.slug}`}
                    className="flex items-baseline gap-4 py-1 hover:bg-surface"
                  >
                    <span className="w-28 shrink-0 text-muted">
                      {r.work.catalogueNum}
                    </span>
                    <span className="flex-1">
                      {r.work.title}
                      {r.work.key && `, ${r.work.key}`}
                    </span>
                    <span className="text-xs text-muted">
                      {[
                        r.year,
                        r.mediaType === "spotify" ? "Spotify" : "YouTube",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
