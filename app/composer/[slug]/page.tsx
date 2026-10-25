import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ComposerSchools from "@/components/ComposerSchools";
import WorksList from "@/components/WorksList";
import { db } from "@/lib/db";
import { getSchools, getWorksForComposer } from "@/lib/queries";
import { composers } from "@/lib/schema";

export default function ComposerPage({
  params,
}: PageProps<"/composer/[slug]">) {
  return (
    <main className="p-6 w-full max-w-3xl mx-auto">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Works params={params} />
      </Suspense>
    </main>
  );
}

async function Works({
  params,
}: Pick<PageProps<"/composer/[slug]">, "params">) {
  const { slug } = await params;

  const [composer] = await db
    .select()
    .from(composers)
    .where(eq(composers.slug, slug));
  if (!composer) notFound();

  const [works, schools] = await Promise.all([
    getWorksForComposer(composer.id),
    getSchools(composer.id),
  ]);

  return (
    <>
      <header className="flex items-baseline gap-3 mb-4">
        <Link
          href="/"
          aria-label="Back to composers"
          className="text-muted hover:text-text"
        >
          ←
        </Link>
        <h1 className="text-xl font-serif">{composer.name}</h1>
        {composer.era && (
          <span className="text-xs text-muted">{composer.era}</span>
        )}
      </header>
      <ComposerSchools composerId={composer.id} schools={schools} />
      {works.length === 0 ? (
        <p className="text-muted">No works yet.</p>
      ) : (
        <WorksList composerSlug={composer.slug} works={works} />
      )}
    </>
  );
}
