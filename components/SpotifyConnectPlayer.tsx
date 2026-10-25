"use client";

import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useMovementRequests, usePlayerSync } from "./PlayerSync";
import SpotifyEmbed from "./SpotifyEmbed";
import { useSpotifyPlayback } from "./SpotifyPlayback";
import { extractSpotifyId } from "@/lib/media";
import { recordingTrackIds } from "@/lib/queue";
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
  autoplay = false,
  onEnded,
}: {
  recording: Recording;
  /** Start playing once connected (playing through a performer). */
  autoplay?: boolean;
  /** Spotify moved past the recording's own tracks. */
  onEnded?: () => void;
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

  // Playing through: start the recording once, as soon as Spotify answers.
  const started = useRef(false);
  useEffect(() => {
    if (!autoplay || !connected || started.current) return;
    started.current = true;
    command("/api/spotify/play", { recordingId: recording.id }).then(setError);
  }, [autoplay, connected, command, recording.id]);

  // …and move on once Spotify has played one of its tracks and left them
  // (the album went on). Unknown for a whole album without movement tracks.
  const reachedOurs = useRef(false);
  const ended = useEffectEvent(() => onEnded?.());
  useEffect(() => {
    const ours = recordingTrackIds(recording);
    if (!trackId || !ours) return;
    if (ours.has(trackId)) {
      reachedOurs.current = true;
    } else if (reachedOurs.current) {
      reachedOurs.current = false;
      ended();
    }
  }, [trackId, recording]);

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
