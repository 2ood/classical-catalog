"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LikeButton from "./LikeButton";
import PlayerControls, { playerButton } from "./PlayerControls";
import { useSpotifyPlayback } from "./SpotifyPlayback";

/**
 * On every page while Spotify has a track (stacked bottom-right by the
 * layout): cover, track, ⏮ ⏯ ⏭, repeat, like, a link to the work (at the
 * movement) the track belongs to, and Disconnect. Minimizes to the track.
 */
export default function MiniPlayer() {
  const { playback, command, refresh } = useSpotifyPlayback();
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
  const path = located?.track === track.id ? located.path : null;
  const toggle = (
    <button
      type="button"
      aria-label={minimized ? "Expand the player" : "Minimize the player"}
      aria-expanded={!minimized}
      onClick={() => setMinimized((m) => !m)}
      className="shrink-0 text-base leading-none text-muted hover:text-text"
    >
      {minimized ? "▴" : "▾"}
    </button>
  );

  if (minimized) {
    return (
      <aside
        aria-label="Now playing"
        className="flex items-center gap-2 px-3 py-1.5 bg-bg border border-border rounded-md shadow-lg text-sm"
      >
        <p className="flex-1 min-w-0 truncate">{track.name}</p>
        {toggle}
      </aside>
    );
  }

  return (
    <aside
      aria-label="Now playing"
      className="flex flex-col gap-2 p-3 bg-bg border border-border rounded-md shadow-lg text-sm"
    >
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
        {toggle}
      </div>
      <div className="flex items-center gap-2">
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
          className={`${playerButton} ${repeating ? "bg-inverse-bg text-inverse-text" : ""}`}
        >
          ↻
        </button>
        <LikeButton trackId={track.id} />
      </div>
      {error && <p className="text-xs text-muted">{error}</p>}
      <div className="flex items-center gap-2 text-xs text-muted">
        {path && path !== pathname && (
          <Link href={path} className="hover:text-text">
            Go to current track
          </Link>
        )}
        <button
          type="button"
          onClick={async () => {
            setError(await command("/api/spotify/disconnect"));
            await refresh();
          }}
          className="ml-auto hover:text-text"
        >
          Disconnect Spotify
        </button>
      </div>
    </aside>
  );
}
