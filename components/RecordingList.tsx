"use client";

import Link from "next/link";
import { useState } from "react";
import { usePlayerSync } from "./PlayerSync";
import { useSpotifyPlayback } from "./SpotifyPlayback";
import { movementLabel } from "@/lib/movements";
import { performerInitials } from "@/lib/recordings";
import type { Recording } from "@/lib/schema";
import { trackInRecording } from "@/lib/spotify";

const SOURCE = { spotify: "Spotify", youtube: "YouTube" } as const;
const DOT = { spotify: "bg-spotify", youtube: "bg-youtube" } as const;

type Row = {
  label: string;
  /** What an avatar plays: a movement, or null for the whole recording. */
  movementId: string | null;
  /** What the ★ likes ("" for a single piece); null for no ★. */
  likeId: string | null;
  recordings: Recording[];
  playing: boolean;
};

/**
 * A work's recordings by movement: the whole work first, then each movement
 * (a single piece is one row), with an avatar per recording that has it.
 * An avatar plays its recording there and selects it; the selected one is
 * named below, and the ★s are its likes.
 */
export default function RecordingList({
  recordings,
  selectedId,
  workTitle,
  onPlay,
  onDelete,
  onEdit,
  performers = {},
  likes = {},
}: {
  recordings: Recording[];
  selectedId: string | undefined;
  /** Names the one row of a single piece (a work without movements). */
  workTitle: string;
  onPlay: (recordingId: string, movementId: string | null) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  /** Each recording's performers, linked to their pages. */
  performers?: Record<string, { name: string; slug: string }[]>;
  /** Liked movement ids per recording ("" for a recording's piece). */
  likes?: Record<string, string[]>;
}) {
  const { movements, current } = usePlayerSync();
  const { playback } = useSpotifyPlayback();
  const selected = recordings.find((r) => r.id === selectedId);
  const liked = likes[selectedId ?? ""] ?? [];

  const loaded = playback?.connected ? playback.state : null;
  const rows: Row[] =
    movements.length === 0
      ? [
          {
            label: workTitle,
            movementId: null,
            likeId: "",
            recordings,
            playing:
              !!selected &&
              !!loaded?.isPlaying &&
              !!loaded.track &&
              trackInRecording(selected, {
                id: loaded.track.id,
                albumId: loaded.track.album.id,
              }),
          },
        ]
      : [
          {
            label: "Whole work",
            movementId: null,
            likeId: null,
            recordings,
            playing: false,
          },
          ...movements.map((m, i) => ({
            label: movementLabel(m, i),
            movementId: m.id,
            likeId: m.id,
            recordings: recordings.filter(
              (r) => r.movementStarts[m.id] !== undefined,
            ),
            playing: current === m.id,
          })),
        ];

  return (
    <>
      <ul aria-label="Recordings by movement" className="flex flex-col">
        {rows.map((row) => (
          <li
            key={row.movementId ?? "whole"}
            aria-current={row.playing ? "true" : undefined}
            className="flex items-center gap-2 py-1 text-sm"
          >
            <span
              data-label
              className={`flex-1 truncate ${
                row.playing
                  ? "text-accent font-medium"
                  : row.recordings.length
                    ? ""
                    : "text-muted"
              }`}
            >
              {row.label}
            </span>
            {selected &&
            row.likeId !== null &&
            row.recordings.includes(selected) ? (
              <LikeStar
                key={`${selected.id}-${row.likeId}`}
                recordingId={selected.id}
                movementId={row.likeId}
                label={row.label}
                liked={liked.includes(row.likeId)}
              />
            ) : (
              <span className="w-6 shrink-0" />
            )}
            {/* Room for the source dot sticking out of the last avatar. */}
            <span className="flex flex-wrap justify-end gap-1.5 pr-1">
              {row.recordings.map((r) => (
                <Avatar
                  key={r.id}
                  recording={r}
                  label={row.label}
                  selected={r.id === selectedId}
                  onClick={() => onPlay(r.id, row.movementId)}
                />
              ))}
            </span>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="mt-2 pt-2 border-t border-border text-sm">
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate">
              {selected.performer}
              {selected.year && ` · ${selected.year}`}
              <span className="text-muted">
                {" "}
                · {SOURCE[selected.mediaType]}
              </span>
            </span>
            <button
              type="button"
              aria-label={`Edit the recording by ${selected.performer}`}
              onClick={() => onEdit(selected.id)}
              className="text-xs text-muted hover:text-text"
            >
              ✎
            </button>
            <button
              type="button"
              aria-label={`Delete the recording by ${selected.performer}`}
              onClick={() => onDelete(selected.id)}
              className="text-xs text-muted hover:text-text"
            >
              ✕
            </button>
          </div>
          {(performers[selected.id] ?? []).length > 0 && (
            <p className="text-xs text-muted">
              {performers[selected.id].map((p, i) => (
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
        </div>
      )}
    </>
  );
}

/** A recording's initials, with a dot for its source (Spotify / YouTube). */
function Avatar({
  recording,
  label,
  selected,
  onClick,
}: {
  recording: Recording;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const who = [recording.performer, recording.year, SOURCE[recording.mediaType]]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      aria-label={`Play ${label} by ${who}`}
      aria-current={selected ? "true" : undefined}
      title={who}
      onClick={onClick}
      className={`relative w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs ${
        selected
          ? "bg-inverse-bg text-inverse-text"
          : "bg-surface border border-border text-muted hover:text-text"
      }`}
    >
      {performerInitials(recording.performer)}
      <span
        role="img"
        aria-label={SOURCE[recording.mediaType]}
        className={`absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full ring-2 ring-bg ${DOT[recording.mediaType]}`}
      />
    </button>
  );
}

/** ★: likes a recording's movement (or piece), shown at once and saved behind. */
function LikeStar({
  recordingId,
  movementId,
  label,
  liked: initial,
}: {
  recordingId: string;
  movementId: string;
  label: string;
  liked: boolean;
}) {
  const [liked, setLiked] = useState(initial);
  async function toggle() {
    const next = !liked;
    setLiked(next);
    const res = await fetch("/api/likes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordingId, movementId, liked: next }),
    }).catch(() => null);
    if (!res?.ok) setLiked(!next);
  }
  return (
    <button
      type="button"
      aria-label={`Like ${label}`}
      aria-pressed={liked}
      onClick={toggle}
      className={`w-6 h-6 shrink-0 text-sm ${
        liked ? "text-text" : "text-muted hover:text-text"
      }`}
    >
      {liked ? "★" : "☆"}
    </button>
  );
}
