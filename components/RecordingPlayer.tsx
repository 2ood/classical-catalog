"use client";

import { useRef, useState } from "react";
import { useMovementRequests, usePlayerSync } from "./PlayerSync";
import RecordingMovementEditor from "./RecordingMovementEditor";
import SpotifyConnectPlayer from "./SpotifyConnectPlayer";
import YouTubePlayer, { type YouTubeHandle } from "./YouTubePlayer";
import { extractYouTubeId } from "@/lib/media";
import {
  currentMovementIndex,
  placeMovements,
  type MovementMarks,
} from "@/lib/movements";
import type { Recording } from "@/lib/schema";

/**
 * Plays one recording and keeps it in step with the score by movement:
 * a movement chosen in the score seeks the YouTube video, and a playing
 * video turns the score at each new movement (Spotify recordings sync in
 * SpotifyConnectPlayer). Render with `key={recording.id}` so state resets
 * per recording.
 */
export default function RecordingPlayer({
  recording,
}: {
  recording: Recording;
}) {
  const { movements, select } = usePlayerSync();
  const youtube = useRef<YouTubeHandle>(null);
  const lastMovement = useRef<string | null>(null);
  const [editing, setEditing] = useState(false);
  const starts = recording.movementStarts;

  useMovementRequests("recording", (movementId) => {
    const start = starts[movementId];
    if (recording.mediaType === "youtube" && typeof start === "number") {
      lastMovement.current = movementId;
      youtube.current?.seekTo(start);
    }
  });

  const times = placeMovements(
    movements,
    Object.fromEntries(
      Object.entries(starts).filter(([, s]) => typeof s === "number"),
    ) as MovementMarks<number>,
  );
  function handleTime(seconds: number) {
    const index = currentMovementIndex(times, seconds);
    const movementId = index === -1 ? null : times[index].id;
    if (movementId !== lastMovement.current) {
      lastMovement.current = movementId;
      if (movementId) select(movementId, "recording");
    }
  }

  const videoId =
    recording.mediaType === "youtube"
      ? extractYouTubeId(recording.mediaUrl)
      : null;

  return (
    <>
      <div className="flex items-center gap-3 text-sm text-muted">
        <p className="flex-1">
          {recording.performer}
          {recording.year && ` · ${recording.year}`}
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="hover:text-text"
          >
            {Object.keys(starts).length ? "Edit movements" : "Add movements"}
          </button>
        )}
      </div>
      {editing && (
        <RecordingMovementEditor
          recordingId={recording.id}
          mediaType={recording.mediaType}
          movements={movements}
          starts={starts}
          currentTime={() => youtube.current?.currentTime() ?? null}
          onClose={() => setEditing(false)}
        />
      )}
      <div className="flex-1 min-h-0">
        {recording.mediaType === "spotify" ? (
          <SpotifyConnectPlayer recording={recording} />
        ) : videoId ? (
          <YouTubePlayer ref={youtube} videoId={videoId} onTime={handleTime} />
        ) : (
          <p className="text-muted">
            Can&apos;t embed this link: {recording.mediaUrl}
          </p>
        )}
      </div>
    </>
  );
}
