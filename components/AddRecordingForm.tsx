"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlayerSync } from "./PlayerSync";
import { extractSpotifyId, extractYouTubeId } from "@/lib/media";
import { movementLabel } from "@/lib/movements";
import type { RecordingPreview } from "@/lib/suggestions";

const input =
  "border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text";

type Answer =
  | { status: "ready"; data: RecordingPreview }
  | { status: "not-connected" }
  | { status: "failed"; error: string };

type Preview = { status: "none" } | { status: "loading" } | Answer;

/** A Spotify album or track link: worth asking Spotify about. */
function spotifyLink(url: string) {
  const id = extractSpotifyId(url);
  return id?.type === "album" || id?.type === "track";
}

/**
 * Adds a recording. A pasted Spotify album (or track) link fills performer
 * and year from Spotify and matches the album's tracks to the work's
 * movements, each changeable before saving.
 */
export default function AddRecordingForm({
  workId,
  initialUrl = "",
  onAdded,
}: {
  workId: string;
  /** e.g. a suggested album. */
  initialUrl?: string;
  onAdded?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { movements } = usePlayerSync();
  const [performer, setPerformer] = useState("");
  const [year, setYear] = useState("");
  const [mediaType, setMediaType] = useState<"youtube" | "spotify">(
    spotifyLink(initialUrl) ? "spotify" : "youtube",
  );
  const [url, setUrl] = useState(initialUrl);
  // Spotify's answer, for the link it was asked about.
  const [answer, setAnswer] = useState<(Answer & { link: string }) | null>(
    null,
  );
  const [starts, setStarts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // The link to ask Spotify about: a Spotify album or track.
  const link = mediaType === "spotify" && spotifyLink(url) ? url : null;
  const preview: Preview = !link
    ? { status: "none" }
    : answer?.link === link
      ? answer
      : { status: "loading" };

  useEffect(() => {
    if (!link) return;
    let stale = false;
    const answer = (a: Answer) => !stale && setAnswer({ ...a, link });
    fetch(
      `/api/spotify/preview?workId=${workId}&url=${encodeURIComponent(link)}`,
    )
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (stale) return;
        if (res.ok) {
          answer({ status: "ready", data: body });
          setPerformer((p) => p || body.performer);
          setYear((y) => y || (body.year ? String(body.year) : ""));
          setStarts(body.movementStarts);
        } else if (body?.code === "not-connected") {
          answer({ status: "not-connected" });
        } else {
          answer({ status: "failed", error: body?.error ?? "Spotify failed" });
        }
      })
      .catch(() => answer({ status: "failed", error: "Spotify failed" }));
    return () => {
      stale = true;
    };
  }, [link, workId]);

  function handleUrl(next: string) {
    setUrl(next);
    if (extractSpotifyId(next)) setMediaType("spotify");
    else if (extractYouTubeId(next)) setMediaType("youtube");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const ready = preview.status === "ready" ? preview.data : null;
    const res = await fetch("/api/recordings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workId,
        performer,
        year,
        mediaType,
        mediaUrl: ready?.mediaUrl ?? url,
        movementStarts: ready
          ? Object.fromEntries(Object.entries(starts).filter(([, t]) => t))
          : {},
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Failed to add");
      return;
    }
    onAdded?.();
    router.refresh();
  }

  const tracks = preview.status === "ready" ? preview.data.tracks : [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          placeholder="Performer"
          required
          value={performer}
          onChange={(e) => setPerformer(e.target.value)}
          className={input}
        />
        <input
          placeholder="Year"
          inputMode="numeric"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className={`${input} w-20`}
        />
        <select
          aria-label="Media type"
          value={mediaType}
          onChange={(e) =>
            setMediaType(e.target.value as "youtube" | "spotify")
          }
          className={input}
        >
          <option value="youtube">YouTube</option>
          <option value="spotify">Spotify</option>
        </select>
        <input
          placeholder="URL"
          required
          value={url}
          onChange={(e) => handleUrl(e.target.value)}
          className={`${input} flex-1 min-w-64`}
        />
        <button
          type="submit"
          disabled={pending || preview.status === "loading"}
          className="px-3 py-1 bg-inverse-bg text-inverse-text hover:bg-[#333] disabled:opacity-40"
        >
          + Add
        </button>
      </div>
      {preview.status === "loading" && (
        <p className="text-muted">Reading the album from Spotify…</p>
      )}
      {preview.status === "not-connected" && (
        <p className="text-muted">
          <a
            href={`/api/spotify/login?returnTo=${encodeURIComponent(pathname)}`}
            className="underline"
          >
            Connect Spotify
          </a>{" "}
          to match the album&apos;s tracks to movements.
        </p>
      )}
      {preview.status === "failed" && (
        <p className="text-muted">{preview.error}</p>
      )}
      {movements.length > 0 && tracks.length > 0 && (
        <div className="flex flex-col gap-1">
          {movements.map((m, i) => {
            const label = movementLabel(m, i);
            return (
              <label key={m.id} className="flex items-center gap-2">
                <span className="w-56 shrink-0 truncate text-muted">
                  {label}
                </span>
                <select
                  aria-label={`Track for ${label}`}
                  value={starts[m.id] ?? ""}
                  onChange={(e) =>
                    setStarts((s) => ({ ...s, [m.id]: e.target.value }))
                  }
                  className={`${input} flex-1 min-w-0`}
                >
                  <option value="">—</option>
                  {tracks.map((t) => (
                    <option key={t.url} value={t.url}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      )}
      {error && <p className="text-muted">{error}</p>}
    </form>
  );
}
