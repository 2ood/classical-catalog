import Link from "next/link";
import { Suspense } from "react";
import { likedList } from "@/lib/likes";
import { getLikes } from "@/lib/queries";

export default function LikedPage() {
  return (
    <main className="p-6 w-full max-w-3xl mx-auto">
      <h1 className="text-xl font-serif mb-4">Liked</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Liked />
      </Suspense>
    </main>
  );
}

async function Liked() {
  const groups = likedList(await getLikes());
  if (groups.length === 0) {
    return (
      <p className="text-muted">
        Nothing liked yet — the ☆ beside a recording&apos;s tracks likes a
        movement.
      </p>
    );
  }
  return groups.map((group) => (
    <section key={group.composer} className="mb-6">
      <h2 className="text-xs uppercase text-muted border-t border-border pt-2 mb-1">
        {group.composer}
      </h2>
      <ul>
        {group.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-baseline gap-3 py-1 hover:bg-surface"
            >
              <span className="flex-1 min-w-0 truncate">{item.label}</span>
              <span className="shrink-0 text-xs text-muted">
                {item.performer}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ));
}
