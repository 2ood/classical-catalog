import { asc } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { composers } from "@/lib/schema";

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-xl mb-4">Composers</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <ComposerList />
      </Suspense>
    </main>
  );
}

async function ComposerList() {
  const rows = await db
    .select({ id: composers.id, name: composers.name })
    .from(composers)
    .orderBy(asc(composers.name));

  if (rows.length === 0) return <p className="text-muted">No composers yet.</p>;
  return (
    <ul>
      {rows.map((c) => (
        <li key={c.id}>
          <Link href={`/composer/${c.id}`} className="hover:underline">
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
