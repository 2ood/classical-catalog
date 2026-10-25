/**
 * Play-through: a performer's recordings one after another. The queue is a
 * performer and a position, kept in the work page's URL
 * (`?queue=seong-jin-cho&at=1`).
 */
import { extractSpotifyId } from "./media";
import type { MovementMarks } from "./movements";
import { compareCatalogue } from "./works";

type Queued = {
  id: string;
  composer: { slug: string; name: string; born: number | null };
  work: { slug: string; catalogueNum: string | null; title: string };
};

/** By composer (in birth order), then catalogue number — the performer page's order. */
export function orderForQueue<T extends Queued>(recordings: T[]): T[] {
  return [...recordings].sort(
    (a, b) =>
      (a.composer.born ?? 0) - (b.composer.born ?? 0) ||
      a.composer.name.localeCompare(b.composer.name) ||
      compareCatalogue(a.work.catalogueNum, b.work.catalogueNum),
  );
}

export function queueHref(item: Queued, performerSlug: string, at: number) {
  return `/composer/${item.composer.slug}/${item.work.slug}?queue=${performerSlug}&at=${at}`;
}

export type QueueStep = {
  recordingId: string;
  /** 1-based. */
  position: number;
  total: number;
  previous: string | null;
  next: string | null;
  /** The whole queue, for listing. */
  items: { href: string; composer: string; work: string; current: boolean }[];
};

/**
 * Where a queue is on this work's page: `at` (from the URL) must point at a
 * recording of this work, else there is no queue here.
 */
export function queueStep(
  queue: Queued[],
  performerSlug: string,
  at: string,
  here: { composer: string; work: string },
): QueueStep | null {
  const i = /^\d+$/.test(at) ? Number(at) : -1;
  const item = queue[i];
  if (
    !item ||
    item.composer.slug !== here.composer ||
    item.work.slug !== here.work
  ) {
    return null;
  }
  const link = (j: number) =>
    queue[j] ? queueHref(queue[j], performerSlug, j) : null;
  return {
    recordingId: item.id,
    position: i + 1,
    total: queue.length,
    previous: link(i - 1),
    next: link(i + 1),
    items: queue.map((q, j) => ({
      href: queueHref(q, performerSlug, j),
      composer: q.composer.name,
      work: [q.work.catalogueNum, q.work.title].filter(Boolean).join(" "),
      current: j === i,
    })),
  };
}

/**
 * The Spotify tracks that are this recording: its movements' tracks, or its
 * own track. Null for a whole album without movement tracks — its end can't
 * be told from the rest of the album.
 */
export function recordingTrackIds(recording: {
  mediaUrl: string;
  movementStarts: MovementMarks<number | string>;
}): Set<string> | null {
  const tracks = Object.values(recording.movementStarts).flatMap((start) =>
    typeof start === "string" ? [extractSpotifyId(start)?.id ?? ""] : [],
  );
  if (tracks.length > 0) return new Set(tracks.filter(Boolean));
  const own = extractSpotifyId(recording.mediaUrl);
  return own?.type === "track" ? new Set([own.id]) : null;
}
