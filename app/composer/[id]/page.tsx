import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { UUID } from "@/lib/recordings";
import { composers, works } from "@/lib/schema";

export default function ComposerPage({ params }: PageProps<"/composer/[id]">) {
  return (
    <main className="p-6">
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

  const rows = await db
    .select()
    .from(works)
    .where(eq(works.composerId, id))
    .orderBy(asc(works.genre), asc(works.catalogueNum));

  return (
    <>
      <Link href="/" className="text-sm text-muted hover:text-text">
        ← Composers
      </Link>
      <h1 className="text-xl font-serif mt-2 mb-4">
        {composer.name}{" "}
        <span className="text-xs text-muted">{composer.era}</span>
      </h1>
      {rows.length === 0 ? (
        <p className="text-muted">No works yet.</p>
      ) : (
        <ul>
          {rows.map((w) => (
            <li key={w.id}>
              <Link href={`/work/${w.id}`} className="hover:underline">
                <span className="text-muted">{w.catalogueNum}</span> {w.title}
                {w.key && `, ${w.key}`}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
