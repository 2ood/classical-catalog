"use client";

import Link from "next/link";
import LoopIcon from "./LoopIcon";
import { MinimizeButton, MinimizedBar } from "./PlayerBar";
import type { PlayMode } from "@/lib/playback";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

// The small part of the YouTube IFrame API this app uses.
// With endSeconds the video stops (and ends) there.
type VideoRequest = {
  videoId: string;
  startSeconds: number;
  endSeconds?: number;
};
type YTPlayer = {
  loadVideoById(request: VideoRequest): void;
  cueVideoById(request: VideoRequest): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
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

/** Where the floating players sit; dragged to any corner. */
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// Below the 3rem header at the top.
const CORNER_CLASS: Record<Corner, string> = {
  "top-left": "top-16 left-4",
  "top-right": "top-16 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
};

/** The corner of a w×h window nearest to (x, y). */
export function nearestCorner(x: number, y: number, w: number, h: number) {
  return `${y < h / 2 ? "top" : "bottom"}-${x < w / 2 ? "left" : "right"}` as Corner;
}

// The furthest the players stretch, however far they are pulled.
const STRETCH = 48;

/** How far the players stretch for a pull of `d` px: less and less. */
export function rubberBand(d: number) {
  return (
    Math.sign(d) * STRETCH * (1 - 1 / ((Math.abs(d) * 0.35) / STRETCH + 1))
  );
}

/**
 * A choice kept in this browser's storage, shared by every component that
 * reads it (a convenience: the fallback without storage).
 */
function localSetting<T extends string>(
  key: string,
  values: readonly T[],
  fallback: T,
) {
  const listeners = new Set<() => void>();
  return {
    fallback,
    read(): T {
      try {
        const saved = localStorage.getItem(key);
        if (saved && values.includes(saved as T)) return saved as T;
      } catch {}
      return fallback;
    },
    save(value: T) {
      try {
        localStorage.setItem(key, value);
      } catch {}
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function useSetting<T extends string>(
  setting: ReturnType<typeof localSetting<T>>,
) {
  return useSyncExternalStore(
    setting.subscribe,
    setting.read,
    () => setting.fallback,
  );
}

const cornerSetting = localSetting<Corner>(
  "players-corner",
  ["top-left", "top-right", "bottom-left", "bottom-right"],
  "bottom-right",
);
const modeSetting = localSetting<PlayMode>(
  "play-mode",
  ["along", "loop", "off"],
  "along",
);

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
    options: { start?: number; end?: number; autoplay: boolean },
  ) => void;
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  /** Play along (on to the next track), loop the current track, or off. */
  playMode: PlayMode;
  setPlayMode: (mode: PlayMode) => void;
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
      }, 250); // Often enough to jump at a track's end in time.
    });
  }, [flush, notify]);

  const load = useCallback<YouTubeDock["load"]>(
    (next, { start = 0, end, autoplay }) => {
      videoRef.current = next;
      setVideo(next);
      setStatus("cued");
      pending.current = {
        request: {
          videoId: next.videoId,
          startSeconds: start,
          ...(end !== undefined && { endSeconds: end }),
        },
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

  const pause = useCallback(() => {
    if (pending.current) pending.current.autoplay = false;
    else playerRef.current?.pauseVideo();
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
  const corner = useSetting(cornerSetting);
  const playMode = useSetting(modeSetting);
  // Dragging the stack: in the corner the drag began, it stretches toward
  // the pointer; over another corner, it moves there at once (and sits
  // still); let go, it springs back into its corner. Only once the pointer
  // moves (so a click stays a click), and the click ending it is no click.
  const dragStart = useRef<{ x: number; y: number; corner: Corner } | null>(
    null,
  );
  const dragged = useRef(false);
  const [pull, setPull] = useState<{ x: number; y: number } | null>(null);
  const stretched = pull
    ? { translate: `${rubberBand(pull.x)}px ${rubberBand(pull.y)}px` }
    : undefined;
  // Springs back (with a little overshoot) when let go.
  const spring = pull
    ? ""
    : "transition-[translate] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
  const drag = (e: React.PointerEvent) => {
    const start = dragStart.current;
    if (!start) return;
    if (!dragged.current) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 4) return;
      dragged.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    const next = nearestCorner(
      e.clientX,
      e.clientY,
      window.innerWidth,
      window.innerHeight,
    );
    if (next !== corner) cornerSetting.save(next);
    setPull(
      next === start.corner
        ? { x: e.clientX - start.x, y: e.clientY - start.y }
        : { x: 0, y: 0 },
    );
  };
  const endDrag = () => {
    dragStart.current = null;
    setPull(null);
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
        pause,
        playMode,
        setPlayMode: modeSetting.save,
        currentTime,
        slot,
        listeners,
      }}
    >
      {children}
      {/* In a corner: the floating video above the rest (the mini player). */}
      <div
        role="region"
        aria-label="Players"
        onPointerDown={(e) => {
          const control = "a, button:not([data-drag]), input, select";
          if ((e.target as Element).closest(control)) return;
          dragStart.current = { x: e.clientX, y: e.clientY, corner };
          dragged.current = false;
        }}
        onClickCapture={(e) => {
          if (!dragged.current) return;
          dragged.current = false;
          e.stopPropagation();
        }}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`fixed ${CORNER_CLASS[corner]} z-50 w-80 flex flex-col gap-2 cursor-grab touch-none select-none`}
      >
        {/* Each part stretches on its own, not the stack: a moved stack
            would carry the video shown over its work page with it. */}
        <div
          aria-hidden={mode === "hidden" || undefined}
          style={
            mode === "slot" && box
              ? { ...box }
              : mode === "float"
                ? stretched
                : undefined
          }
          className={
            mode === "slot"
              ? "fixed"
              : mode === "hidden"
                ? "fixed bottom-4 right-4 w-80 aspect-video invisible pointer-events-none"
                : `flex flex-col ${status === "playing" ? "bg-accent-tint" : "bg-bg"} border border-border rounded-md shadow-lg overflow-hidden ${spring}`
          }
        >
          {/* Shrunk, not removed, when minimized: the sound plays on. */}
          <div
            ref={hostRef}
            className={
              mode !== "float"
                ? "w-full h-full"
                : // Folds, animated; 16:9 of the stack's w-80.
                  `order-2 w-full overflow-hidden transition-[height] duration-200 ease-out ${
                    minimized ? "h-0" : "h-45"
                  }`
            }
          />
          {mode === "float" &&
            video &&
            (minimized ? (
              <MinimizedBar
                playing={status === "playing"}
                onPlayPause={status === "playing" ? pause : play}
                subject="the video"
                expandLabel="Expand the video"
                onExpand={() => setMinimized(false)}
                className="order-1 px-3 py-1.5 text-sm"
              >
                {video.title}
              </MinimizedBar>
            ) : (
              <div className="order-1 flex items-center gap-2 px-3 py-1.5 text-sm">
                <Link
                  href={video.href}
                  className="flex-1 min-w-0 truncate hover:underline"
                >
                  {video.title}
                </Link>
                <PlayModeToggle />
                <MinimizeButton
                  label="Minimize the video"
                  onClick={() => setMinimized(true)}
                />
              </div>
            ))}
        </div>
        {below && (
          <div style={stretched} className={`empty:hidden ${spring}`}>
            {below}
          </div>
        )}
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

const MODES: Record<PlayMode, { name: string; title: string }> = {
  along: { name: "play along", title: "Playing on to the next track" },
  loop: { name: "loop the track", title: "Looping the track playing" },
  off: { name: "off", title: "Neither playing on nor looping" },
};
const NEXT_MODE: Record<PlayMode, PlayMode> = {
  along: "loop",
  loop: "off",
  off: "along",
};

/** Plays along, loops the track playing, or neither: in turn. */
export function PlayModeToggle() {
  const { playMode, setPlayMode } = useYouTube();
  return (
    <button
      type="button"
      aria-label={`Play mode: ${MODES[playMode].name}`}
      title={MODES[playMode].title}
      onClick={() => setPlayMode(NEXT_MODE[playMode])}
      className={`shrink-0 hover:opacity-70 ${
        playMode === "off" ? "text-muted" : "text-accent"
      }`}
    >
      <LoopIcon one={playMode === "loop"} />
    </button>
  );
}
