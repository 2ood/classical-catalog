/**
 * Concerts: one YouTube video holding several pieces, each a recording of
 * its work with its own span (start and end) of the video.
 */

import { extractYouTubeId } from "./media";

/** YouTube recordings by video id (Spotify ones left out). */
export function byVideo<
  R extends { mediaType: "youtube" | "spotify"; mediaUrl: string },
>(recordings: R[]): Map<string, R[]> {
  const groups = new Map<string, R[]>();
  for (const r of recordings) {
    const videoId =
      r.mediaType === "youtube" ? extractYouTubeId(r.mediaUrl) : null;
    if (videoId) groups.set(videoId, [...(groups.get(videoId) ?? []), r]);
  }
  return groups;
}

type Span = {
  id: string;
  startSeconds: number | null;
  endSeconds: number | null;
};

/**
 * Where each span of one video ends: its own end, else the next span's
 * start; null for the video's end.
 */
export function spanEnds(spans: Span[]): Record<string, number | null> {
  const starts = spans.map((s) => s.startSeconds ?? 0);
  return Object.fromEntries(
    spans.map((s, i) => {
      const next = starts
        .filter((start) => start > starts[i])
        .reduce<number | null>(
          (min, start) => Math.min(min ?? start, start),
          null,
        );
      return [s.id, s.endSeconds ?? next];
    }),
  );
}

/**
 * A video listed as a concert: several pieces, or one piece within it (a
 * span); a video that is just one recording isn't.
 */
export function isConcert(spans: Span[]): boolean {
  return (
    spans.length > 1 ||
    spans.some((s) => s.startSeconds !== null || s.endSeconds !== null)
  );
}
