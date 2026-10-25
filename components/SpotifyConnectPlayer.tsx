"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMovementRequests, usePlayerSync } from "./PlayerSync";
import SpotifyEmbed from "./SpotifyEmbed";
import { useSpotifyPlayback } from "./SpotifyPlayback";
import { extractSpotifyId } from "@/lib/media";
import { movementForTrack } from "@/lib/spotify";
import type { Recording } from "@/lib/schema";

const button = "px-3 py-1 border border-border hover:bg-surface";

/**
 * A Spotify recording played on the owner's Spotify app (Spotify Connect).
 * Until Spotify is connected it shows the embed (and "Connect Spotify");
 * once connected it draws nothing — the mini player shows what plays — and
 * keeps the work in step: a movement chosen (a track's ▶, the score) plays
 * its track, and the playing track turns the score to its movement.
 */
export default function SpotifyConnectPlayer({
  recording,
}: {
  recording: Recording;
}) {
  const { select } = usePlayerSync();
  const { configured, playback, command } = useSpotifyPlayback();
  const pathname = usePathname();
  const [embedTrack, setEmbedTrack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastTrack = useRef<string | null>(null);
  const connected = playback?.connected === true;
  const state = playback?.connected ? playback.state : null;
  const trackId = state?.track?.id;

  // Spotify moved to a track of one of this recording's movements: the
  // score follows.
  useEffect(() => {
    if (!trackId || trackId === lastTrack.current) return;
    lastTrack.current = trackId;
    const movementId = movementForTrack(recording.movementStarts, trackId);
    if (movementId) select(movementId, "recording");
  }, [trackId, recording.movementStarts, select]);

  const run = async (path: string, body?: object) =>
    setError(await command(path, body));

  function playMovement(movementId: string) {
    const track = recording.movementStarts[movementId];
    // Don't echo this back to the score when the poll sees the new track.
    lastTrack.current =
      typeof track === "string" ? (extractSpotifyId(track)?.id ?? null) : null;
    run("/api/spotify/play", { recordingId: recording.id, movementId });
  }

  useMovementRequests("recording", (movementId) => {
    const track = recording.movementStarts[movementId];
    if (typeof track !== "string") return;
    if (connected) {
      playMovement(movementId);
    } else {
      setEmbedTrack(track);
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

  // Connected: what is playing, and its controls, are in the mini player.
  return error ? <p className="text-sm text-muted">{error}</p> : null;
}
