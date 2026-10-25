"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import GenreFilter from "./GenreFilter";
import { plain } from "@/lib/import";
import { EPOCHS, type OpenOpusComposer } from "@/lib/openopus";

export type LibraryComposer = OpenOpusComposer & {
  imported: { slug: string; works: number } | null;
};

const input =
  "border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text";

function years({ born, died }: LibraryComposer) {
  if (!born) return "";
  return died ? `${born}–${died}` : `b. ${born}`;
}

export default function LibraryBrowser({
  composers,
  initialQuery = "",
}: {
  composers: LibraryComposer[];
  /** e.g. a composer clicked in a map view (`?q=`). */
  initialQuery?: string;
}) {
  const router = useRouter();
  const [epoch, setEpoch] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [importing, setImporting] = useState<{
    id: number;
    status: string;
  } | null>(null);
  const [error, setError] = useState<{ id: number; message: string } | null>(
    null,
  );

  const epochs = EPOCHS.filter((e) => composers.some((c) => c.epoch === e));
  const q = plain(query);
  const visible = composers.filter(
    (c) =>
      (!epoch || c.epoch === epoch) &&
      (!q || plain(`${c.completeName} ${c.name}`).includes(q)),
  );

  async function handleImport(openOpusId: number) {
    setImporting({ id: openOpusId, status: "Importing…" });
    setError(null);
    const res = await fetch("/api/library/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openOpusId }),
    });
    if (!res.ok || !res.body) {
      setImporting(null);
      const message =
        (await res.json().catch(() => null))?.error ?? "Failed to import";
      setError({ id: openOpusId, message });
      return;
    }

    // Newline-delimited JSON: imported, progress…, then done or error.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const message of lines.filter(Boolean).map((l) => JSON.parse(l))) {
        if (message.type === "progress") {
          const status = `Movements ${message.done} / ${message.total}…`;
          setImporting({ id: openOpusId, status });
        } else if (message.type === "error") {
          setError({
            id: openOpusId,
            message: `Works imported, but movements failed: ${message.error}`,
          });
        } else if (message.type === "done" && message.movements === null) {
          setError({
            id: openOpusId,
            message:
              "Works imported, but MusicBrainz has no match for this composer, so no movements were added.",
          });
        }
      }
    }
    setImporting(null);
    router.refresh();
  }

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search composers"
        className={`${input} w-full mb-4 text-sm`}
      />
      <GenreFilter genres={epochs} selected={epoch} onSelect={setEpoch} />
      {visible.length === 0 ? (
        <p className="text-muted">No composers match.</p>
      ) : (
        <ul>
          {visible.map((c) => (
            <li
              key={c.openOpusId}
              className="flex flex-wrap items-baseline gap-x-3 py-1.5 border-b border-border"
            >
              <span>
                {c.imported ? (
                  <Link
                    href={`/composer/${c.imported.slug}`}
                    className="hover:underline"
                  >
                    {c.completeName}
                  </Link>
                ) : (
                  c.completeName
                )}
              </span>
              <span className="text-xs text-muted">{years(c)}</span>
              {!epoch && <span className="text-xs text-muted">{c.epoch}</span>}
              <span className="ml-auto flex items-baseline gap-3 text-sm">
                {c.imported && (
                  <span className="text-muted">{c.imported.works} works</span>
                )}
                {importing?.id === c.openOpusId ? (
                  <span className="text-muted">{importing.status}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleImport(c.openOpusId)}
                    disabled={importing !== null}
                    aria-label={`${c.imported ? "Update" : "Import"} ${c.completeName}`}
                    className={
                      c.imported
                        ? "text-muted hover:text-text disabled:opacity-40"
                        : "px-2 py-0.5 border border-border hover:border-text disabled:opacity-40"
                    }
                  >
                    {c.imported ? "Update" : "Import"}
                  </button>
                )}
              </span>
              {error?.id === c.openOpusId && (
                <p className="w-full text-sm text-muted">{error.message}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
