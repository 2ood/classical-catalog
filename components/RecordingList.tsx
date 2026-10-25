"use client";

import Link from "next/link";
import { usePlayerSync } from "./PlayerSync";
import { useSpotifyPlayback } from "./SpotifyPlayback";
import { movementLabel } from "@/lib/movements";
import type { Recording } from "@/lib/schema";
import { trackInRecording } from "@/lib/spotify";

const SOURCE = { spotify: "Spotify", youtube: "YouTube" } as const;
// What is playing: title and ▶ in the accent color (the button inherits it).
const NOW_PLAYING = "text-accent font-medium";
const play =
  "w-6 h-6 shrink-0 flex items-center justify-center rounded-sm hover:bg-surface text-xs";

/**
 * A work's recordings, one row each; the selected one shows its tracks
 * (one per movement, or the piece itself), each with its own play button.
 */
export default function RecordingList({
  recordings,
  selectedId,
  workTitle,
  onSelect,
  onDelete,
  onEdit,
  performers = {},
}: {
  recordings: Recording[];
  selectedId: string | undefined;
  /** Names the one track of a single piece (a work without movements). */
  workTitle: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  /** Each recording's performers, linked to their pages. */
  performers?: Record<string, { name: string; slug: string }[]>;
}) {
  return (
    <ul className="flex flex-col">
      {recordings.map((r) => {
        const selected = r.id === selectedId;
        return (
          <li key={r.id} className="group border-b border-border last:border-0">
            <div className="flex items-center gap-2 py-1.5">
              <button
                type="button"
                aria-expanded={selected}
                onClick={() => onSelect(r.id)}
                className={`flex-1 flex items-baseline gap-2 text-left text-sm ${
                  selected ? "font-medium" : "text-muted hover:text-text"
                }`}
              >
                <span className="flex-1 truncate">
                  {r.performer}
                  {r.year && ` · ${r.year}`}
                </span>
                <span className="text-xs text-muted font-normal">
                  {SOURCE[r.mediaType]}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Edit the recording by ${r.performer}`}
                onClick={() => onEdit(r.id)}
                className="text-xs text-muted hover:text-text opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                ✎
              </button>
              <button
                type="button"
                aria-label={`Delete the recording by ${r.performer}`}
                onClick={() => onDelete(r.id)}
                className="text-xs text-muted hover:text-text opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                ✕
              </button>
            </div>
            {selected && (performers[r.id] ?? []).length > 0 && (
              <p className="pl-1 pb-1 text-xs text-muted">
                {performers[r.id].map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && " · "}
                    <Link
                      href={`/performer/${p.slug}`}
                      className="hover:text-text hover:underline"
                    >
                      {p.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            {selected && (
              <RecordingTracks recording={r} workTitle={workTitle} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RecordingTracks({
  recording,
  workTitle,
}: {
  recording: Recording;
  workTitle: string;
}) {
  const { movements, current, select } = usePlayerSync();
  const { playback, command } = useSpotifyPlayback();
  const connected = playback?.connected === true;

  if (movements.length === 0) {
    // A single piece: the recording is the one track.
    const loaded = playback?.connected ? playback.state : null;
    const playing =
      !!loaded?.isPlaying &&
      !!loaded.track &&
      trackInRecording(recording, {
        id: loaded.track.id,
        albumId: loaded.track.album.id,
      });
    return (
      <ol aria-label="Tracks" className="pb-2 pl-1 text-sm">
        <li
          aria-current={playing ? "true" : undefined}
          className={`flex items-center gap-2 ${playing ? NOW_PLAYING : ""}`}
        >
          {recording.mediaType === "spotify" && connected ? (
            <button
              type="button"
              aria-label={`Play ${workTitle}`}
              onClick={() =>
                command("/api/spotify/play", { recordingId: recording.id })
              }
              className={play}
            >
              ▶
            </button>
          ) : (
            <span className="w-6 text-center text-muted">·</span>
          )}
          <span className="flex-1 truncate">{workTitle}</span>
        </li>
      </ol>
    );
  }

  return (
    <ol aria-label="Tracks" className="pb-2 pl-1 text-sm">
      {movements.map((m, i) => {
        const label = movementLabel(m, i);
        const marked = recording.movementStarts[m.id] !== undefined;
        const isCurrent = current === m.id;
        return (
          <li
            key={m.id}
            aria-current={isCurrent ? "true" : undefined}
            className={`flex items-center gap-2 ${
              isCurrent ? NOW_PLAYING : marked ? "" : "text-muted"
            }`}
          >
            {marked ? (
              <button
                type="button"
                aria-label={`Play ${label}`}
                // Both panes follow: the score turns, the recording plays.
                onClick={() => select(m.id, "link")}
                className={play}
              >
                ▶
              </button>
            ) : (
              <span className="w-6 text-center">·</span>
            )}
            <span className="flex-1 truncate">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
