import Link from "next/link";
import { Suspense } from "react";
import { byInstrument, KINDS, type PerformerKind } from "@/lib/performers";
import { getPerformers } from "@/lib/queries";

const HEADINGS: Record<PerformerKind, string> = {
  person: "People",
  orchestra: "Orchestras",
  choir: "Choirs",
  ensemble: "Ensembles",
};

export default function PerformersPage() {
  return (
    <main className="p-6 w-full max-w-3xl mx-auto">
      <h1 className="text-xl font-serif mb-4">Performers</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Performers />
      </Suspense>
    </main>
  );
}

async function Performers() {
  const performers = await getPerformers();
  if (performers.length === 0) {
    return <p className="text-muted">No performers yet.</p>;
  }
  return KINDS.map((kind) => {
    const ofKind = performers.filter((p) => p.kind === kind);
    if (ofKind.length === 0) return null;
    return (
      <section key={kind} className="mb-6">
        <h2 className="text-xs uppercase text-muted border-t border-border pt-2 mb-1">
          {HEADINGS[kind]}
        </h2>
        {kind === "person" ? (
          // People by instrument or role (Piano, Conductor, …).
          byInstrument(ofKind).map((group) => (
            <div key={group.name} className="mb-3">
              <h3 className="text-xs text-muted mt-2">{group.name}</h3>
              <PerformerList performers={group.performers} />
            </div>
          ))
        ) : (
          <PerformerList performers={ofKind} />
        )}
      </section>
    );
  });
}

function PerformerList({
  performers,
}: {
  performers: Awaited<ReturnType<typeof getPerformers>>;
}) {
  return (
    <ul>
      {performers.map((p) => (
        <li key={p.id}>
          <Link
            href={`/performer/${p.slug}`}
            className="flex items-baseline gap-3 py-1 hover:bg-surface"
          >
            <span className="flex-1">{p.name}</span>
            <span className="text-xs text-muted">
              {p.recordings} {p.recordings === 1 ? "recording" : "recordings"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
