"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  type Ref,
} from "react";

// The small part of the YouTube IFrame API this app uses.
type YTPlayer = {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width: string;
      height: string;
      playerVars?: Record<string, number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number; ENDED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  api ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.append(script);
  });
  return api;
}

export type YouTubeHandle = {
  seekTo: (seconds: number) => void;
  /** Plays, once the player is ready. */
  play: () => void;
  /** Playback position in seconds, or null before the player is ready. */
  currentTime: () => number | null;
};

/** A YouTube embed that can be sought and reports its position while playing. */
export default function YouTubePlayer({
  videoId,
  onTime,
  autoplay = false,
  onEnded,
  ref,
}: {
  videoId: string;
  /** Starts playing once loaded. */
  autoplay?: boolean;
  /** The video reached its end. */
  onEnded?: () => void;
  /** Called about once a second while the video plays. */
  onTime?: (seconds: number) => void;
  ref?: Ref<YouTubeHandle>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  // A seek before the player is ready (e.g. opened at a movement).
  const pendingStart = useRef<number | null>(null);
  const tick = useEffectEvent((seconds: number) => onTime?.(seconds));
  const ended = useEffectEvent(() => onEnded?.());
  const autoplayOnLoad = useEffectEvent(() => autoplay);

  useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds) => {
        if (playerRef.current) playerRef.current.seekTo(seconds, true);
        else pendingStart.current = seconds;
      },
      play: () => playerRef.current?.playVideo(),
      currentTime: () => playerRef.current?.getCurrentTime() ?? null,
    }),
    [],
  );

  useEffect(() => {
    const host = hostRef.current;
    let cancelled = false;
    let player: YTPlayer | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !host) return;
      // The API replaces this element with its iframe.
      const target = document.createElement("div");
      host.replaceChildren(target);
      // Cued at the pending start, not played.
      const start = pendingStart.current;
      pendingStart.current = null;
      player = new YT.Player(target, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          ...(start !== null && { start: Math.floor(start) }),
          ...(autoplayOnLoad() && { autoplay: 1 }),
        },
        events: {
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED) ended();
          },
          onReady: () => {
            playerRef.current = player;
            // Asked for after the player was created but before it was ready.
            if (pendingStart.current !== null) {
              player?.seekTo(pendingStart.current, true);
              pendingStart.current = null;
            }
          },
        },
      });
      timer = setInterval(() => {
        const p = playerRef.current;
        if (p && p.getPlayerState() === YT.PlayerState.PLAYING) {
          tick(p.getCurrentTime());
        }
      }, 1000);
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      playerRef.current = null;
      player?.destroy();
      host?.replaceChildren();
    };
  }, [videoId]);

  return <div ref={hostRef} className="w-full h-full" />;
}
