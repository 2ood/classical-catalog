import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import WorksList from "@/components/WorksList";
import { isLoggedIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorksForComposer } from "@/lib/queries";
import { UUID } from "@/lib/recordings";
import { composers } from "@/lib/schema";

export default function ComposerPage({ params }: PageProps<"/composer/[id]">) {
  return (
    <main className="p-6 max-w-3xl">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Works params={params} />
      </Suspense>
    </main>
  );
}

async function Works({ params }: Pick<PageProps<"/composer/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [composer] = await db
    .select()
    .from(composers)
    .where(eq(composers.id, id));
  if (!composer) notFound();

  const works = await getWorksForComposer(id);

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
        <Suspense>
          <EditLink composerId={id} />
        </Suspense>
      </header>
      {works.length === 0 ? (
        <p className="text-muted">No works yet.</p>
      ) : (
        <WorksList works={works} />
      )}
    </>
  );
}

async function EditLink({ composerId }: { composerId: string }) {
  if (!(await isLoggedIn())) return null;
  return (
    <Link
      href={`/admin/composer/${composerId}`}
      className="ml-auto text-sm text-muted hover:text-text"
    >
      Edit
    </Link>
  );
}
