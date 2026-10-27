"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LikeButton from "./LikeButton";
import LoopIcon from "./LoopIcon";
import { Fold, MinimizeButton, MinimizedBar } from "./PlayerBar";
import PlayerControls, { playerButton } from "./PlayerControls";
import { useSpotifyPlayback } from "./SpotifyPlayback";

/**
 * On every page while Spotify has a track (stacked in a corner by the
 * layout): cover, track, like ⏮ ⏯ ⏭ repeat, and a link to the work (at the
 * movement) the track belongs to; tinted while playing. Minimizes to ⏯ and
 * the track. (Disconnecting waits for a settings page, with logins.)
 */
export default function MiniPlayer() {
  const { playback, command } = useSpotifyPlayback();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  // Where the track lives, for the track it was looked up for.
  const [located, setLocated] = useState<{
    track: string;
    path: string | null;
  }>();
  const track = playback?.connected ? playback.state?.track : null;
  const trackId = track?.id;
  const albumId = track?.album.id;

  useEffect(() => {
    if (!trackId) return;
    let stale = false;
    const query = `track=${trackId}${albumId ? `&album=${albumId}` : ""}`;
    fetch(`/api/spotify/locate?${query}`)
      .then((res) => (res.ok ? res.json() : { path: null }))
      .then((body) => !stale && setLocated({ track: trackId, path: body.path }))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [trackId, albumId]);

  if (!track) return null;
  const repeating = playback?.connected && playback.state?.repeat === "track";
  const playing = !!(playback?.connected && playback.state?.isPlaying);
  const tint = playing ? "bg-accent-tint" : "bg-bg";
  const path = located?.track === track.id ? located.path : null;

  // Both are kept, one folded away, so it folds and unfolds animated.
  return (
    <aside
      aria-label="Now playing"
      className={`${tint} border border-border rounded-md shadow-lg text-sm`}
    >
      <Fold open={minimized}>
        <MinimizedBar
          playing={playing}
          onPlayPause={async () =>
            setError(
              playing
                ? await command("/api/spotify/pause")
                : await command("/api/spotify/play", { resume: true }),
            )
          }
          expandLabel="Expand the player"
          onExpand={() => setMinimized(false)}
          className="px-3 py-1.5"
        >
          {track.name}
        </MinimizedBar>
      </Fold>
      <Fold open={!minimized}>
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-3">
            {track.album.cover && (
              // A Spotify CDN thumbnail; next/image would only add a proxy.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.album.cover}
                alt=""
                className="w-12 h-12 shrink-0 rounded-sm object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate">{track.name}</p>
              <p className="text-xs text-muted truncate">{track.artists}</p>
            </div>
            <MinimizeButton
              label="Minimize the player"
              onClick={() => setMinimized(true)}
              className="self-start"
            />
          </div>
          <div
            role="group"
            aria-label="Controls"
            className="flex items-center justify-center gap-1"
          >
            <LikeButton trackId={track.id} />
            <PlayerControls
              onError={setError}
              onPlay={async () =>
                setError(await command("/api/spotify/play", { resume: true }))
              }
            />
            <button
              type="button"
              aria-label="Repeat this track"
              aria-pressed={repeating}
              onClick={async () =>
                setError(
                  await command("/api/spotify/control", {
                    action: repeating ? "repeat-off" : "repeat-track",
                  }),
                )
              }
              className={`${playerButton} ${repeating ? "text-accent" : "text-muted"}`}
            >
              <LoopIcon one />
            </button>
          </div>
          {error && <p className="text-xs text-muted">{error}</p>}
          {path && path !== pathname && (
            <Link href={path} className="text-xs text-muted hover:text-text">
              Go to current track
            </Link>
          )}
        </div>
      </Fold>
    </aside>
  );
}
