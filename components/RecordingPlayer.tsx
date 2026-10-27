"use client";

import { usePathname } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useMovementRequests, usePlayerSync } from "./PlayerSync";
import RecordingMovementEditor from "./RecordingMovementEditor";
import SpotifyConnectPlayer from "./SpotifyConnectPlayer";
import { shouldLoad, useYouTube, useYouTubeEvents } from "./YouTubeDock";
import { extractYouTubeId, youTubeStart } from "@/lib/media";
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
 * SpotifyConnectPlayer). YouTube plays in the app's one player
 * (YouTubeDock), shown over this pane while it holds this recording.
 * Render with `key={recording.id}` so state resets per recording.
 */
export default function RecordingPlayer({
  recording,
  workTitle,
  chosen = false,
  autoplay = false,
  playRequest = 0,
  onEnded,
}: {
  recording: Recording;
  /** Names the video when it floats on other pages. */
  workTitle: string;
  /** Picked by the owner here, so it replaces a video playing elsewhere. */
  chosen?: boolean;
  /** Start playing on arrival (playing through a performer). */
  autoplay?: boolean;
  /** Raised to play the whole recording from its start (the list's avatar). */
  playRequest?: number;
  /** The recording reached its end. */
  onEnded?: () => void;
}) {
  const { movements, request, select } = usePlayerSync();
  const {
    video: docked,
    status,
    load,
    seekTo,
    play,
    currentTime,
    slot,
  } = useYouTube();
  const pathname = usePathname();
  const lastMovement = useRef<string | null>(null);
  // The movement asked for on arrival (e.g. opened at a movement), not by ▶.
  const arrivalSeq = useRef(request?.seq);
  const [editing, setEditing] = useState(false);
  const starts = recording.movementStarts;
  const videoId =
    recording.mediaType === "youtube"
      ? extractYouTubeId(recording.mediaUrl)
      : null;
  const holding = !!videoId && docked?.recordingId === recording.id;
  // Where the piece starts in the video (a `t=` link, e.g. into a concert).
  const pieceStart = youTubeStart(recording.mediaUrl) ?? undefined;

  const startOf = (movementId: string | undefined) => {
    const start = movementId ? starts[movementId] : undefined;
    return typeof start === "number" ? start : undefined;
  };
  const loadHere = (start: number | undefined, playNow: boolean) => {
    if (!videoId) return;
    load(
      {
        recordingId: recording.id,
        videoId,
        title: `${workTitle} — ${recording.performer}`,
        href: `${pathname}?recording=${recording.id}`,
      },
      { start, autoplay: playNow },
    );
  };

  const arrive = useEffectEvent(() => {
    if (!videoId) return;
    const start = startOf(request?.movementId);
    if (holding) {
      // Back at the work of the video playing: opened at a movement, go there.
      if (start !== undefined) seekTo(start);
      return;
    }
    const loaded = docked && {
      recordingId: docked.recordingId,
      status,
    };
    if (shouldLoad(loaded, recording.id, chosen)) {
      loadHere(start ?? pieceStart, autoplay);
    }
  });
  // Before paint, so the "Play here" placeholder doesn't flash.
  useLayoutEffect(() => arrive(), []);

  const playWhole = useEffectEvent(() => {
    if (!videoId) return;
    if (holding) {
      seekTo(pieceStart ?? 0);
      play();
    } else {
      loadHere(pieceStart, true);
    }
  });
  useEffect(() => {
    if (playRequest) playWhole();
  }, [playRequest]);

  useMovementRequests("recording", (movementId) => {
    if (request?.seq === arrivalSeq.current) return;
    const start = startOf(movementId);
    if (!videoId || start === undefined) return;
    lastMovement.current = movementId;
    // A track's ▶ (or a movement chosen in the score) plays it.
    if (holding) {
      seekTo(start);
      play();
    } else {
      loadHere(start, true);
    }
  });

  const times = placeMovements(
    movements,
    Object.fromEntries(
      Object.entries(starts).filter(([, s]) => typeof s === "number"),
    ) as MovementMarks<number>,
  );
  useYouTubeEvents(recording.id, {
    onTime: (seconds) => {
      const index = currentMovementIndex(times, seconds);
      const movementId = index === -1 ? null : times[index].id;
      if (movementId !== lastMovement.current) {
        lastMovement.current = movementId;
        if (movementId) select(movementId, "recording");
      }
    },
    onEnded,
  });

  return (
    <>
      <div className="flex items-center justify-end gap-3 text-sm text-muted">
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
          currentTime={() => (holding ? currentTime() : null)}
          onClose={() => setEditing(false)}
        />
      )}
      <div className="flex-1 min-h-0">
        {recording.mediaType === "spotify" ? (
          <SpotifyConnectPlayer
            recording={recording}
            autoplay={autoplay}
            playRequest={playRequest}
            onEnded={onEnded}
          />
        ) : holding ? (
          // The one player is positioned over this.
          <div ref={slot} className="w-full h-full" />
        ) : videoId ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 border border-border text-sm text-muted">
            {docked && <p>Playing: {docked.title}</p>}
            <button
              type="button"
              onClick={() => loadHere(pieceStart, true)}
              className="px-2 py-0.5 border border-border text-text hover:bg-surface"
            >
              ▶ Play this recording here
            </button>
          </div>
        ) : (
          <p className="text-muted">
            Can&apos;t embed this link: {recording.mediaUrl}
          </p>
        )}
      </div>
    </>
  );
}
