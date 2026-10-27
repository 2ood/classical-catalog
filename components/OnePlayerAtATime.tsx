"use client";

import { useEffect, useRef } from "react";
import { useSpotifyPlayback } from "./SpotifyPlayback";
import { useYouTube } from "./YouTubeDock";

/**
 * Never both playing: the video starting pauses Spotify, and Spotify
 * starting pauses the video. Pausing one never resumes the other.
 */
export default function OnePlayerAtATime() {
  const { status, pause } = useYouTube();
  const { playback, command } = useSpotifyPlayback();
  const video = status === "playing";
  const spotify = !!(playback?.connected && playback.state?.isPlaying);
  const was = useRef({ video: false, spotify: false });

  useEffect(() => {
    const started = {
      video: video && !was.current.video,
      spotify: spotify && !was.current.spotify,
    };
    was.current = { video, spotify };
    if (started.video && spotify) command("/api/spotify/pause");
    else if (started.spotify && video) pause();
  }, [video, spotify, command, pause]);

  return null;
}
