"use client";

import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useMovementRequests, usePlayerSync } from "./PlayerSync";
import SpotifyEmbed from "./SpotifyEmbed";
import { extractSpotifyId } from "@/lib/media";
import { movementForTrack, type Playback } from "@/lib/spotify";
import type { Recording } from "@/lib/schema";

const POLL_MS = 2000;
const button = "px-3 py-1 border border-border hover:bg-surface";

/**
 * A Spotify recording played on the owner's Spotify app (Spotify Connect).
 * Falls back to the embed until Spotify is connected. Either way, a
 * movement chosen in the score plays its track; when connected, the
 * playing track also turns the score to its movement.
 */
export default function SpotifyConnectPlayer({
  recording,
}: {
  recording: Recording;
}) {
  const { select } = usePlayerSync();
  const pathname = usePathname();
  const [configured, setConfigured] = useState(true);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [embedTrack, setEmbedTrack] = useState<string | null>(null);
  // Chosen before Spotify was connected (e.g. opened at a movement); Play
  // starts it rather than playing on its own.
  const [queued, setQueued] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastTrack = useRef<string | null>(null);
  const connected = playback?.connected === true;

  const onPlayback = useEffectEvent((next: Playback) => {
    setPlayback(next);
    const trackId = next.connected ? next.state?.track?.id : undefined;
    if (!trackId || trackId === lastTrack.current) return;
    lastTrack.current = trackId;
    const movementId = movementForTrack(recording.movementStarts, trackId);
    if (movementId) select(movementId, "recording");
  });

  useEffect(() => {
    let stopped = false;
    fetch("/api/spotify/status")
      .then((res) => res.json())
      .then((status) => !stopped && setConfigured(status.configured))
      .catch(() => {});
    async function poll() {
      if (document.visibilityState !== "visible") return;
      const res = await fetch("/api/spotify/playback").catch(() => null);
      if (!stopped && res?.ok) onPlayback(await res.json());
    }
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);

  async function post(path: string, body?: object) {
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
    });
    if (!res.ok) {
      setError(
        (await res.json().catch(() => null))?.error ??
          `Spotify request failed (${res.status})`,
      );
    }
  }

  useMovementRequests("recording", (movementId) => {
    const track = recording.movementStarts[movementId];
    if (typeof track !== "string") return;
    if (connected) {
      // Don't echo this back to the score when the poll sees the new track.
      lastTrack.current = extractSpotifyId(track)?.id ?? null;
      setQueued(null);
      post("/api/spotify/play", { recordingId: recording.id, movementId });
    } else {
      setEmbedTrack(track);
      setQueued(movementId);
    }
  });

  if (!connected) {
    return (
      <div className="h-full flex flex-col gap-2">
        <div className="flex items-center gap-3 text-sm text-muted">
          {configured ? (
            <a
              href={`/api/spotify/login?returnTo=${encodeURIComponent(pathname)}`}
              className={button}
            >
              Connect Spotify
            </a>
          ) : (
            <span>
              To play in your Spotify app, set SPOTIFY_CLIENT_ID in .env (see
              README).
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <SpotifyEmbed
            url={embedTrack ?? recording.mediaUrl}
            title={recording.performer}
          />
        </div>
      </div>
    );
  }

  const state = playback.state;
  return (
    <div className="flex flex-col gap-3 border border-border p-4 text-sm">
      <h3 className="text-xs uppercase text-muted">Spotify</h3>
      {state?.track ? (
        <p>
          {state.track.name} — {state.track.artists}
          {state.device && (
            <span className="text-muted"> · on {state.device}</span>
          )}
        </p>
      ) : (
        <p className="text-muted">Nothing playing.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {state?.isPlaying ? (
          <button
            type="button"
            onClick={() => post("/api/spotify/pause")}
            className={button}
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (queued) {
                const track = recording.movementStarts[queued];
                lastTrack.current =
                  typeof track === "string"
                    ? (extractSpotifyId(track)?.id ?? null)
                    : null;
                setQueued(null);
                post("/api/spotify/play", {
                  recordingId: recording.id,
                  movementId: queued,
                });
              } else if (state?.track) {
                post("/api/spotify/play", { resume: true });
              } else {
                post("/api/spotify/play", { recordingId: recording.id });
              }
            }}
            className={button}
          >
            Play
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            post("/api/spotify/play", { recordingId: recording.id })
          }
          className={button}
        >
          Play this recording from the start
        </button>
        <button
          type="button"
          onClick={async () => {
            await post("/api/spotify/disconnect");
            setPlayback({ connected: false });
          }}
          className="ml-auto text-muted hover:text-text"
        >
          Disconnect
        </button>
      </div>
      {error && <p className="text-muted">{error}</p>}
    </div>
  );
}
