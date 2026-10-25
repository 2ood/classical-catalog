"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Suggestion } from "@/lib/suggestions";

const button = "px-2 py-0.5 border border-border hover:bg-surface";

type State =
  | { status: "loading" }
  | { status: "ready"; suggestions: Suggestion[] }
  | { status: "not-connected" }
  | { status: "not-configured" }
  | { status: "failed"; error: string };

/**
 * For a work without recordings: Spotify albums to start from ("Add" opens
 * the add form with the album), and a YouTube search link.
 */
export default function SuggestedRecordings({
  workId,
  query,
  onAdd,
}: {
  workId: string;
  /** "Brahms Klavierstücke Op. 118" */
  query: string;
  /** Opens the add form with the album's link. */
  onAdd: (albumUrl: string) => void;
}) {
  const pathname = usePathname();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let stale = false;
    fetch(`/api/spotify/suggestions?workId=${workId}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (stale) return;
        if (res.ok) {
          setState({ status: "ready", suggestions: body.suggestions });
        } else if (
          body?.code === "not-connected" ||
          body?.code === "not-configured"
        ) {
          setState({ status: body.code });
        } else {
          setState({ status: "failed", error: body?.error ?? "Search failed" });
        }
      })
      .catch(
        () => !stale && setState({ status: "failed", error: "Search failed" }),
      );
    return () => {
      stale = true;
    };
  }, [workId]);

  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="text-xs uppercase text-muted">Suggested recordings</h3>
      {state.status === "loading" && (
        <p className="text-muted">Searching Spotify…</p>
      )}
      {state.status === "not-connected" && (
        <p className="text-muted">
          <a
            href={`/api/spotify/login?returnTo=${encodeURIComponent(pathname)}`}
            className={button}
          >
            Connect Spotify
          </a>{" "}
          to see Spotify albums of this work.
        </p>
      )}
      {state.status === "failed" && <p className="text-muted">{state.error}</p>}
      {state.status === "ready" &&
        (state.suggestions.length === 0 ? (
          <p className="text-muted">Spotify found no albums for this work.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.suggestions.map((s) => (
              <li key={s.albumId} className="flex items-baseline gap-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate">{s.name}</p>
                  <p className="text-xs text-muted truncate">
                    {[s.performer, s.year].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-text"
                >
                  Listen ↗
                </a>
                <button
                  type="button"
                  onClick={() => onAdd(s.url)}
                  aria-label={`Add ${s.name}`}
                  className={button}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        ))}
      <a
        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-muted hover:text-text"
      >
        Find on YouTube ↗
      </a>
    </div>
  );
}
