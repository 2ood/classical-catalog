"use client";

import Link from "next/link";
import { useState } from "react";
import GenreFilter from "./GenreFilter";
import { groupByGenre } from "@/lib/works";

export type ListedWork = {
  id: string;
  catalogueNum: string | null;
  title: string;
  genre: string;
  key: string | null;
  hasRecording: boolean;
};

export default function WorksList({ works }: { works: ListedWork[] }) {
  const [genre, setGenre] = useState<string | null>(null);
  const groups = groupByGenre(works);
  const visible = genre ? groups.filter((g) => g.genre === genre) : groups;

  return (
    <>
      {groups.length > 1 && (
        <GenreFilter
          genres={groups.map((g) => g.genre)}
          selected={genre}
          onSelect={setGenre}
        />
      )}
      {visible.map((group) => (
        <section key={group.genre} className="mb-6">
          <h2 className="text-xs uppercase text-muted border-t border-border pt-2 mb-1">
            {group.genre}
          </h2>
          <ul>
            {group.works.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/work/${w.id}`}
                  className={`flex items-center gap-4 py-1 hover:bg-surface ${
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
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
