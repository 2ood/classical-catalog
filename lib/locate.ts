import { extractSpotifyId } from "./media";
import type { MovementMarks, WorkMovement } from "./movements";
import { movementSlug } from "./slugs";
import { movementForTrack } from "./spotify";

type Candidate = {
  composerSlug: string;
  workSlug: string;
  movements: WorkMovement[];
  movementStarts: MovementMarks<number | string>;
  mediaUrl: string;
};

/**
 * The page for a playing Spotify track: the work at the movement whose track
 * it is, else the work whose recording is that track or its album.
 */
export function pathForTrack(
  candidates: Candidate[],
  trackId: string,
  albumId: string | null,
): string | null {
  const workPath = (c: Candidate) =>
    `/composer/${c.composerSlug}/${c.workSlug}`;
  for (const c of candidates) {
    const movementId = movementForTrack(c.movementStarts, trackId);
    const index = c.movements.findIndex((m) => m.id === movementId);
    if (index !== -1) {
      return `${workPath(c)}/${movementSlug(c.movements[index], index)}`;
    }
  }
  const byLink = candidates.find((c) => {
    const id = extractSpotifyId(c.mediaUrl)?.id;
    return id === trackId || (albumId !== null && id === albumId);
  });
  return byLink ? workPath(byLink) : null;
}
