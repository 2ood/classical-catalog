"use client";

import { useSpotifyPlayback } from "./SpotifyPlayback";

export const playerButton =
  "w-8 h-8 flex items-center justify-center border border-border rounded-sm hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent";

/**
 * ⏮ ⏯ ⏭ for the owner's Spotify. Play is the caller's (it may start a
 * recording or movement); pause, previous and next go straight to Spotify.
 */
export default function PlayerControls({
  onPlay,
  onError,
}: {
  onPlay: () => void;
  onError: (message: string | null) => void;
}) {
  const { playback, command } = useSpotifyPlayback();
  const state = playback?.connected ? playback.state : null;
  const run = async (path: string, body?: object) =>
    onError(await command(path, body));

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous track"
        disabled={!state?.track}
        onClick={() => run("/api/spotify/control", { action: "previous" })}
        className={playerButton}
      >
        ⏮
      </button>
      {state?.isPlaying ? (
        <button
          type="button"
          aria-label="Pause"
          onClick={() => run("/api/spotify/pause")}
          className={playerButton}
        >
          ❚❚
        </button>
      ) : (
        <button
          type="button"
          aria-label="Play"
          onClick={onPlay}
          className={playerButton}
        >
          ▶
        </button>
      )}
      <button
        type="button"
        aria-label="Next track"
        disabled={!state?.track}
        onClick={() => run("/api/spotify/control", { action: "next" })}
        className={playerButton}
      >
        ⏭
      </button>
    </div>
  );
}
