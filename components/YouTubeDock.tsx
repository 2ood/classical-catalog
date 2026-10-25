"use client";

import Link from "next/link";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";

// The small part of the YouTube IFrame API this app uses.
type VideoRequest = { videoId: string; startSeconds: number };
type YTPlayer = {
  loadVideoById(request: VideoRequest): void;
  cueVideoById(request: VideoRequest): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  stopVideo(): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      width: string;
      height: string;
      playerVars?: Record<string, number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
  };
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

/** A recording's video, as the one player holds it. */
export type DockedVideo = {
  recordingId: string;
  videoId: string;
  /** Shown on the floating player, e.g. "Ballade No. 1 — Zimerman". */
  title: string;
  /** The work page with this recording, linked from the floating player. */
  href: string;
};

/** "cued": loaded but never started. */
export type DockStatus = "cued" | "playing" | "paused" | "ended";

/**
 * Whether a page arriving with `recordingId` loads it into the player:
 * not over another video that is playing, unless the owner chose this one.
 */
export function shouldLoad(
  loaded: { recordingId: string; status: DockStatus } | null,
  recordingId: string,
  chosen: boolean,
): boolean {
  if (loaded?.recordingId === recordingId) return false;
  return chosen || !loaded || loaded.status !== "playing";
}

type Listener = {
  recordingId: string;
  onTime: (seconds: number) => void;
  onEnded: () => void;
};

type YouTubeDock = {
  video: DockedVideo | null;
  status: DockStatus;
  /** Loads a video into the one player, cued or playing. */
  load: (
    video: DockedVideo,
    options: { start?: number; autoplay: boolean },
  ) => void;
  seekTo: (seconds: number) => void;
  play: () => void;
  /** Playback position in seconds, or null before the video is ready. */
  currentTime: () => number | null;
  /** Ref for the area the loaded video is shown over (its work page). */
  slot: (element: HTMLElement | null) => () => void;
  listeners: Set<Listener>;
};

const DockContext = createContext<YouTubeDock | null>(null);

/**
 * One YouTube player for the whole app, so a video keeps playing across
 * navigation. Its iframe never moves in the DOM (that would reload it): it
 * is positioned over its work page's slot, floats bottom-right (above
 * `below`, e.g. the Spotify mini player) once started when there is none,
 * and stays hidden when only cued.
 */
export default function YouTubeDockProvider({
  children,
  below,
}: {
  children: ReactNode;
  /** Stacked under the floating video. */
  below?: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const creating = useRef(false);
  const ticker = useRef<ReturnType<typeof setInterval>>(undefined);
  // Asked for before the player was ready.
  const pending = useRef<{ request: VideoRequest; autoplay: boolean } | null>(
    null,
  );
  const [listeners] = useState(() => new Set<Listener>());
  const videoRef = useRef<DockedVideo | null>(null);
  const [video, setVideo] = useState<DockedVideo | null>(null);
  const [status, setStatus] = useState<DockStatus>("cued");
  const [slotElement, setSlotElement] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<{ element: HTMLElement; box: Box } | null>(
    null,
  );

  const notify = useCallback(
    (call: (listener: Listener) => void) => {
      for (const listener of listeners) {
        if (listener.recordingId === videoRef.current?.recordingId) {
          call(listener);
        }
      }
    },
    [listeners],
  );

  const flush = useCallback(() => {
    const player = playerRef.current;
    const next = pending.current;
    if (!player || !next) return;
    pending.current = null;
    if (next.autoplay) player.loadVideoById(next.request);
    else player.cueVideoById(next.request);
  }, []);

  const createPlayer = useCallback(() => {
    if (creating.current) return;
    creating.current = true;
    loadYouTubeApi().then((YT) => {
      const host = hostRef.current;
      if (!host) return;
      // The API replaces this element with its iframe.
      const target = document.createElement("div");
      host.replaceChildren(target);
      const player = new YT.Player(target, {
        width: "100%",
        height: "100%",
        playerVars: { rel: 0 },
        events: {
          onReady: () => {
            playerRef.current = player;
            flush();
          },
          onStateChange: ({ data }) => {
            if (data === YT.PlayerState.ENDED) {
              setStatus("ended");
              notify((l) => l.onEnded());
            } else if (
              data === YT.PlayerState.PLAYING ||
              data === YT.PlayerState.BUFFERING
            ) {
              setStatus("playing");
            } else if (data === YT.PlayerState.PAUSED) {
              setStatus("paused");
            }
          },
        },
      });
      ticker.current = setInterval(() => {
        const p = playerRef.current;
        if (p && p.getPlayerState() === YT.PlayerState.PLAYING) {
          const seconds = p.getCurrentTime();
          notify((l) => l.onTime(seconds));
        }
      }, 1000);
    });
  }, [flush, notify]);

  const load = useCallback<YouTubeDock["load"]>(
    (next, { start = 0, autoplay }) => {
      videoRef.current = next;
      setVideo(next);
      setStatus("cued");
      pending.current = {
        request: { videoId: next.videoId, startSeconds: start },
        autoplay,
      };
      if (playerRef.current) flush();
      else createPlayer();
    },
    [createPlayer, flush],
  );

  const seekTo = useCallback((seconds: number) => {
    if (pending.current) pending.current.request.startSeconds = seconds;
    else playerRef.current?.seekTo(seconds, true);
  }, []);

  const play = useCallback(() => {
    if (pending.current) pending.current.autoplay = true;
    else playerRef.current?.playVideo();
  }, []);

  const currentTime = useCallback(
    () =>
      pending.current ? null : (playerRef.current?.getCurrentTime() ?? null),
    [],
  );

  const [minimized, setMinimized] = useState(false);

  const close = () => {
    pending.current = null;
    playerRef.current?.stopVideo();
    videoRef.current = null;
    setVideo(null);
  };

  const slot = useCallback((element: HTMLElement | null) => {
    setSlotElement(element);
    return () => setSlotElement((s) => (s === element ? null : s));
  }, []);

  useEffect(
    () => () => {
      clearInterval(ticker.current);
      playerRef.current?.destroy();
    },
    [],
  );

  // Follows the slot every frame: panes resize, editors open above it.
  useEffect(() => {
    if (!slotElement) return;
    let frame = 0;
    const follow = () => {
      const r = slotElement.getBoundingClientRect();
      const box = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      };
      setRect((prev) =>
        prev?.element === slotElement && sameBox(prev.box, box)
          ? prev
          : { element: slotElement, box },
      );
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [slotElement]);

  const box = slotElement && rect?.element === slotElement ? rect.box : null;
  const mode = !video
    ? "hidden"
    : slotElement
      ? box
        ? "slot"
        : "hidden"
      : status === "cued"
        ? "hidden"
        : "float";

  return (
    <DockContext
      value={{
        video,
        status,
        load,
        seekTo,
        play,
        currentTime,
        slot,
        listeners,
      }}
    >
      {children}
      {/* Bottom-right: the floating video above the rest (the mini player). */}
      <div className="fixed bottom-4 right-4 z-50 w-80 flex flex-col gap-2">
        <div
          aria-hidden={mode === "hidden" || undefined}
          style={mode === "slot" && box ? { ...box } : undefined}
          className={
            mode === "slot"
              ? "fixed"
              : mode === "hidden"
                ? "fixed bottom-4 right-4 w-80 aspect-video invisible pointer-events-none"
                : "flex flex-col bg-bg border border-border rounded-md shadow-lg overflow-hidden"
          }
        >
          {/* Shrunk, not removed, when minimized: the sound plays on. */}
          <div
            ref={hostRef}
            className={
              mode !== "float"
                ? "w-full h-full"
                : minimized
                  ? "order-2 h-0 overflow-hidden"
                  : "order-2 w-full aspect-video"
            }
          />
          {mode === "float" && video && (
            <div className="order-1 flex items-center gap-2 px-3 py-1.5 text-sm">
              <Link
                href={video.href}
                className="flex-1 min-w-0 truncate hover:underline"
              >
                {video.title}
              </Link>
              <button
                type="button"
                aria-label={
                  minimized ? "Expand the video" : "Minimize the video"
                }
                aria-expanded={!minimized}
                onClick={() => setMinimized((m) => !m)}
                className="text-base leading-none text-muted hover:text-text"
              >
                {minimized ? "▴" : "▾"}
              </button>
              <button
                type="button"
                aria-label="Close the video"
                onClick={close}
                className="text-muted hover:text-text"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        {below}
      </div>
    </DockContext>
  );
}

type Box = { top: number; left: number; width: number; height: number };

const sameBox = (a: Box, b: Box) =>
  a.top === b.top &&
  a.left === b.left &&
  a.width === b.width &&
  a.height === b.height;

export function useYouTube(): YouTubeDock {
  const dock = use(DockContext);
  if (!dock)
    throw new Error("useYouTube must be used within YouTubeDockProvider");
  return dock;
}

/** Hears the player while `recordingId` is the video loaded in it. */
export function useYouTubeEvents(
  recordingId: string,
  handlers: { onTime?: (seconds: number) => void; onEnded?: () => void },
) {
  const listeners = use(DockContext)?.listeners;
  const onTime = useEffectEvent((s: number) => handlers.onTime?.(s));
  const onEnded = useEffectEvent(() => handlers.onEnded?.());
  useEffect(() => {
    if (!listeners) return;
    const listener: Listener = {
      recordingId,
      onTime: (seconds) => onTime(seconds),
      onEnded: () => onEnded(),
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [listeners, recordingId]);
}
