"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { playerButton } from "./PlayerControls";

type Liked = { track: string; liked: boolean | "needs-reconnect" };

/** ♥ for a track in the owner's Spotify library. */
export default function LikeButton({ trackId }: { trackId: string }) {
  const pathname = usePathname();
  // Spotify's answer, for the track it was asked about.
  const [answer, setAnswer] = useState<Liked | null>(null);
  const liked = answer?.track === trackId ? answer.liked : null;

  useEffect(() => {
    let stale = false;
    fetch(`/api/spotify/library?track=${trackId}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (stale) return;
        if (res.ok) setAnswer({ track: trackId, liked: body.liked });
        else if (body?.code === "needs-reconnect") {
          setAnswer({ track: trackId, liked: "needs-reconnect" });
        }
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [trackId]);

  if (liked === "needs-reconnect") {
    return (
      <a
        href={`/api/spotify/login?returnTo=${encodeURIComponent(pathname)}`}
        className="text-xs text-muted hover:text-text"
      >
        Connect Spotify again to like
      </a>
    );
  }

  async function toggle() {
    const next = !liked;
    setAnswer({ track: trackId, liked: next });
    const res = await fetch("/api/spotify/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track: trackId, liked: next }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setAnswer({
        track: trackId,
        liked: body?.code === "needs-reconnect" ? "needs-reconnect" : !next,
      });
    }
  }

  return (
    <button
      type="button"
      aria-label="Like on Spotify"
      aria-pressed={liked === true}
      disabled={liked === null}
      onClick={toggle}
      className={playerButton}
    >
      {liked ? "♥" : "♡"}
    </button>
  );
}
