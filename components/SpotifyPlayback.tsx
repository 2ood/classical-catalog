"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Playback } from "@/lib/spotify";

const POLL_MS = 2000;
// Spotify takes a moment to report a change it was just asked for.
const SETTLE_MS = 400;

type SpotifyPlayback = {
  /** False when SPOTIFY_CLIENT_ID isn't set. */
  configured: boolean;
  /** Null until the first answer. */
  playback: Playback | null;
  refresh: () => Promise<void>;
  /** POSTs a player request; resolves to an error message, or null. */
  command: (path: string, body?: object) => Promise<string | null>;
};

const PlaybackContext = createContext<SpotifyPlayback | null>(null);

/**
 * What the owner's Spotify is playing, polled once for the whole app (every
 * 2 seconds while the tab is visible) and shared by every player.
 */
export default function SpotifyPlaybackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [configured, setConfigured] = useState(true);
  const [playback, setPlayback] = useState<Playback | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/spotify/playback").catch(() => null);
    if (res?.ok) setPlayback(await res.json());
  }, []);

  useEffect(() => {
    let stopped = false;
    const poll = () => {
      if (!stopped && document.visibilityState === "visible") refresh();
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    fetch("/api/spotify/status")
      .then((res) => res.json())
      .then((status) => {
        if (stopped) return;
        setConfigured(status.configured);
        // Not set up: nothing will ever play here.
        if (!status.configured) clearInterval(timer);
      })
      .catch(() => {});
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [refresh]);

  const command = useCallback(
    async (path: string, body?: object) => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body && JSON.stringify(body),
      });
      setTimeout(refresh, SETTLE_MS);
      if (res.ok) return null;
      return (
        (await res.json().catch(() => null))?.error ??
        `Spotify request failed (${res.status})`
      );
    },
    [refresh],
  );

  return (
    <PlaybackContext value={{ configured, playback, refresh, command }}>
      {children}
    </PlaybackContext>
  );
}

export function useSpotifyPlayback(): SpotifyPlayback {
  const context = use(PlaybackContext);
  if (!context) {
    throw new Error("useSpotifyPlayback must be used within SpotifyPlayback");
  }
  return context;
}
