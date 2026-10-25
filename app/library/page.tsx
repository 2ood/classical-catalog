import { connection } from "next/server";
import { Suspense } from "react";
import LibraryBrowser from "@/components/LibraryBrowser";
import { fetchComposers } from "@/lib/openopus";
import { getImportedComposers } from "@/lib/queries";

export default function LibraryPage() {
  return (
    <main className="p-6 w-full max-w-3xl mx-auto">
      <header className="flex items-baseline gap-3 mb-4">
        <h1 className="text-xl font-serif">Library</h1>
        <span className="text-xs text-muted">Composers from Open Opus</span>
      </header>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Library />
      </Suspense>
    </main>
  );
}

async function Library() {
  await connection();
  const [catalogue, imported] = await Promise.all([
    fetchComposers().catch((error: Error) => error),
    getImportedComposers(),
  ]);
  if (catalogue instanceof Error) {
    return (
      <p className="text-muted">
        Couldn&apos;t reach Open Opus ({catalogue.message}).
      </p>
    );
  }

  const byId = new Map(imported.map((c) => [c.openOpusId, c]));
  return (
    <LibraryBrowser
      composers={catalogue.map((c) => {
        const local = byId.get(c.openOpusId);
        return {
          ...c,
          imported: local ? { slug: local.slug, works: local.works } : null,
        };
      })}
    />
  );
}
