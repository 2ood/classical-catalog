"use client";

import Link from "next/link";
import { useState } from "react";
import GenreFilter from "./GenreFilter";
import { plain } from "@/lib/import";
import { movementLabel, type WorkMovement } from "@/lib/movements";
import { movementSlug } from "@/lib/slugs";
import { normalizeCatalogue } from "@/lib/work-titles";
import { groupByGenre } from "@/lib/works";

export type ListedWork = {
  id: string;
  catalogueNum: string | null;
  title: string;
  slug: string;
  genre: string;
  key: string | null;
  hasRecording: boolean;
  movements: WorkMovement[];
  /** Movement ids some recording has a start time or track for. */
  recordedMovements: string[];
};

/** Title or catalogue number, ignoring accents, case and spacing ("k550"). */
function matches(work: ListedWork, query: string): boolean {
  const q = plain(query);
  if (!q) return true;
  return (
    plain(`${work.catalogueNum ?? ""} ${work.title}`).includes(q) ||
    (!!work.catalogueNum &&
      normalizeCatalogue(work.catalogueNum).includes(normalizeCatalogue(query)))
  );
}

export default function WorksList({
  composerSlug,
  works,
}: {
  composerSlug: string;
  works: ListedWork[];
}) {
  const [genre, setGenre] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [recordedOnly, setRecordedOnly] = useState(false);
  // Movements are shown unless folded away.
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  const groups = groupByGenre(works);
  const visible = groupByGenre(
    works.filter((w) => matches(w, query) && (!recordedOnly || w.hasRecording)),
  ).filter((g) => !genre || g.genre === genre);

  const toggle = (id: string) =>
    setFolded((f) => {
      const next = new Set(f);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <input
          type="search"
          aria-label="Search works"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search works or catalogue numbers"
          className="flex-1 text-sm border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text"
        />
        <button
          type="button"
          aria-pressed={recordedOnly}
          onClick={() => setRecordedOnly((r) => !r)}
          className={`shrink-0 px-2 py-1 rounded-sm text-sm ${
            recordedOnly
              ? "bg-inverse-bg text-inverse-text"
              : "bg-bg border border-border text-muted hover:text-text"
          }`}
        >
          With recordings
        </button>
      </div>
      {groups.length > 1 && (
        <GenreFilter
          genres={groups.map((g) => g.genre)}
          selected={genre}
          onSelect={setGenre}
        />
      )}
      {visible.length === 0 && <p className="text-muted">No works match.</p>}
      {visible.map((group) => (
        <section key={group.genre} className="mb-6">
          <h2 className="text-xs uppercase text-muted border-t border-border pt-2 mb-1">
            {group.genre}
          </h2>
          <ul>
            {group.works.map((w) => {
              const href = `/composer/${composerSlug}/${w.slug}`;
              const open = w.movements.length > 0 && !folded.has(w.id);
              return (
                <li key={w.id}>
                  <div className="flex items-center gap-2">
                    {w.movements.length > 0 ? (
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`Movements of ${w.title}`}
                        onClick={() => toggle(w.id)}
                        className="w-4 shrink-0 text-xs text-muted hover:text-text"
                      >
                        {open ? "▾" : "▸"}
                      </button>
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    <Link
                      href={href}
                      className={`flex-1 flex items-center gap-4 py-1 hover:bg-surface ${
                        w.hasRecording ? "" : "opacity-35"
                      }`}
                    >
                      <span className="w-28 shrink-0 text-muted">
                        {w.catalogueNum}
                      </span>
                      <span className="flex-1">
                        {w.title}
                        {w.key && `, ${w.key}`}
                      </span>
                      {w.hasRecording && (
                        <span
                          role="img"
                          aria-label="Has recordings"
                          className="w-[5px] h-[5px] rounded-full bg-text"
                        />
                      )}
                    </Link>
                  </div>
                  {open && (
                    <ul className="pl-38 mb-1 text-sm text-muted">
                      {w.movements.map((m, i) => (
                        <li key={m.id}>
                          <Link
                            href={`${href}/${movementSlug(m, i)}`}
                            className={`block hover:bg-surface hover:text-text ${
                              w.recordedMovements.includes(m.id)
                                ? ""
                                : "opacity-35"
                            }`}
                          >
                            {movementLabel(m, i)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
