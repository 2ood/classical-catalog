/**
 * Playing along or looping through the tracks of a video: a concert's
 * pieces, a recording's movements, or a single piece; or neither ("off":
 * the video just plays).
 */

export type PlayMode = "along" | "loop" | "off";

export type Track = {
  id: string;
  start: number;
  /** Where it ends (null: the video's end). */
  end: number | null;
  /** Its end is its own (e.g. before the applause), not the next start. */
  stop: boolean;
};

// Only this soon after an end counts as having played up to it; anything
// later was a jump by hand.
const REACHED = 2;

/**
 * What to do at `time`, having last played `current`: looping, go back to
 * its start at its end; playing along, skip from a track's own end to the
 * next track (or pause after the last); off, never jump. Returns the track now playing and
 * the jump, if any (seconds, or "pause").
 */
export function trackJump(
  tracks: Track[],
  current: string | null,
  time: number,
  mode: PlayMode,
): { current: string | null; jump: number | "pause" | null } {
  const playing = tracks.find((t) => t.id === current);
  const reached =
    playing?.end != null && time >= playing.end && time < playing.end + REACHED;
  if (playing && reached && mode !== "off") {
    if (mode === "loop") return { current: playing.id, jump: playing.start };
    if (playing.stop) {
      const next = tracks
        .filter((t) => t.start >= playing.end!)
        .sort((a, b) => a.start - b.start)[0];
      return next
        ? { current: next.id, jump: next.start }
        : // Forgotten, so playing on from here doesn't pause again.
          { current: null, jump: "pause" };
    }
  }
  const inside = tracks.find(
    (t) => time >= t.start && (t.end === null || time < t.end),
  );
  return { current: inside?.id ?? current, jump: null };
}
