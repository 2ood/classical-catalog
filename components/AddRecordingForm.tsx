"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlayerSync } from "./PlayerSync";
import { extractSpotifyId, extractYouTubeId } from "@/lib/media";
import { movementLabel } from "@/lib/movements";
import type { Recording } from "@/lib/schema";
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
  recording,
  onAdded,
  onCancel,
}: {
  workId: string;
  /** e.g. a suggested album. */
  initialUrl?: string;
  /** Edits this recording instead of adding one. */
  recording?: Recording;
  /** After saving. */
  onAdded?: () => void;
  /** Closes the form without saving (Cancel, or Escape). */
  onCancel?: () => void;
}) {
  const startUrl = recording?.mediaUrl ?? initialUrl;
  // Saved Spotify tracks per movement (YouTube times are kept as they are).
  const savedTracks = Object.fromEntries(
    Object.entries(recording?.movementStarts ?? {}).filter(
      (e): e is [string, string] => typeof e[1] === "string",
    ),
  );
  const router = useRouter();
  const pathname = usePathname();
  const { movements } = usePlayerSync();
  const [performer, setPerformer] = useState(recording?.performer ?? "");
  const [year, setYear] = useState(
    recording?.year ? String(recording.year) : "",
  );
  const [mediaType, setMediaType] = useState<"youtube" | "spotify">(
    recording?.mediaType ?? (spotifyLink(initialUrl) ? "spotify" : "youtube"),
  );
  const [url, setUrl] = useState(startUrl);
  // Spotify's answer, for the link it was asked about.
  const [answer, setAnswer] = useState<(Answer & { link: string }) | null>(
    null,
  );
  const [starts, setStarts] = useState<Record<string, string>>(savedTracks);
  // A single piece (no movements): the album's track that is the work.
  const [pieceLink, setPieceLink] = useState(recording ? startUrl : "");
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
          if (recording && link === startUrl) {
            // Editing, link unchanged: saved choices win; gaps get matches.
            setStarts((s) => ({ ...body.movementStarts, ...s }));
          } else {
            setStarts(body.movementStarts);
            setPieceLink(body.mediaUrl);
          }
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
  }, [link, workId, recording, startUrl]);

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
    const tracks = Object.fromEntries(
      Object.entries(starts).filter(([, t]) => t),
    );
    // Editing keeps what it can't show (YouTube times, or tracks while
    // Spotify isn't reachable); adding starts from what was matched.
    const movementStarts = recording
      ? mediaType === "spotify" && ready
        ? { movementStarts: tracks }
        : {}
      : { movementStarts: ready ? tracks : {} };
    const res = await fetch(
      recording ? `/api/recordings/${recording.id}` : "/api/recordings",
      {
        method: recording ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(recording ? {} : { workId }),
          performer,
          year,
          mediaType,
          mediaUrl: ready
            ? movements.length === 0
              ? pieceLink || ready.mediaUrl
              : ready.mediaUrl
            : url,
          ...movementStarts,
        }),
      },
    );
    setPending(false);
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Failed to save");
      return;
    }
    onAdded?.();
    router.refresh();
  }

  const tracks = preview.status === "ready" ? preview.data.tracks : [];

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Escape" && onCancel) onCancel();
      }}
      className="flex flex-col gap-2 text-sm"
    >
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
          {recording ? "Save" : "+ Add"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-muted hover:text-text"
          >
            Cancel
          </button>
        )}
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
      {movements.length === 0 && tracks.length > 0 && (
        <label className="flex items-center gap-2">
          <span className="text-muted">Track</span>
          <select
            aria-label="Track"
            value={pieceLink}
            onChange={(e) => setPieceLink(e.target.value)}
            className={`${input} flex-1 min-w-0`}
          >
            <option
              value={preview.status === "ready" ? preview.data.albumUrl : ""}
            >
              Whole album
            </option>
            {tracks.map((t) => (
              <option key={t.url} value={t.url}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
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
