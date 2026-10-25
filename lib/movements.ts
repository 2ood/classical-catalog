import { extractSpotifyId } from "./media";

/**
 * A work's movement. `name` is usually the tempo marking; the number comes
 * from the position in the work's list. Scores and recordings refer to
 * movements by `id`, so reordering or inserting never shifts their marks.
 */
export type WorkMovement = { id: string; name: string };

/** Score start pages, or recording starts (seconds / Spotify track URL). */
export type MovementMarks<M> = Record<string, M>;

/** One editor row: an existing (`id`) or new movement plus this item's mark. */
export type MovementRow<M> = { id?: string; name: string; mark: M | null };

/** A marked movement, ready for navigation; `start` is a page or seconds. */
export type PlacedMovement = { id: string; label: string; start: number };

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_MOVEMENTS = 100;
const MAX_NAME = 200;
const blank = (v: unknown) => v === null || v === undefined || v === "";

export function parsePage(v: unknown): Parsed<number | null> {
  if (blank(v)) return { ok: true, value: null };
  const page = Number(v);
  return Number.isInteger(page) && page >= 1
    ? { ok: true, value: page }
    : { ok: false, error: "Start pages must be whole numbers from 1" };
}

export function parseSeconds(v: unknown): Parsed<number | null> {
  if (blank(v)) return { ok: true, value: null };
  const seconds = Number(v);
  return Number.isFinite(seconds) && seconds >= 0
    ? { ok: true, value: seconds }
    : { ok: false, error: "Start times must be 0 seconds or later" };
}

export function parseTrackUrl(v: unknown): Parsed<string | null> {
  if (blank(v)) return { ok: true, value: null };
  const spotify = extractSpotifyId(String(v));
  return spotify?.type === "track"
    ? { ok: true, value: `https://open.spotify.com/track/${spotify.id}` }
    : { ok: false, error: "Each movement needs a Spotify track link" };
}

/**
 * Starts sent with a new recording, `{ movementId: mark }`: Spotify track
 * links or YouTube seconds, for movements of the work only; blanks skipped.
 */
export function parseMovementStarts(
  raw: unknown,
  mediaType: "youtube" | "spotify",
  movementIds: string[],
): Parsed<MovementMarks<number | string>> {
  if (raw === undefined || raw === null) return { ok: true, value: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Movement starts must be an object" };
  }
  const known = new Set(movementIds);
  const parse = mediaType === "spotify" ? parseTrackUrl : parseSeconds;
  const starts: MovementMarks<number | string> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!known.has(id)) return { ok: false, error: "Unknown movement" };
    const mark = parse(value);
    if (!mark.ok) return mark;
    if (mark.value !== null) starts[id] = mark.value;
  }
  return { ok: true, value: starts };
}

/** Validates editor rows from a request body, keeping their order. */
export function parseMovementRows<M>(
  body: unknown,
  parseMark: (v: unknown) => Parsed<M | null>,
): Parsed<MovementRow<M>[]> {
  if (!Array.isArray(body)) {
    return { ok: false, error: "Expected a list of movements" };
  }
  if (body.length > MAX_MOVEMENTS) {
    return { ok: false, error: `At most ${MAX_MOVEMENTS} movements` };
  }

  const rows: MovementRow<M>[] = [];
  for (const item of body) {
    if (item?.id !== undefined && typeof item.id !== "string") {
      return { ok: false, error: "Invalid movement id" };
    }
    const name = String(item?.name ?? "").trim();
    if (!name || name.length > MAX_NAME) {
      return { ok: false, error: `Names must be 1–${MAX_NAME} characters` };
    }
    const mark = parseMark(item?.mark);
    if (!mark.ok) return mark;
    rows.push({ id: item?.id, name, mark: mark.value });
  }
  return { ok: true, value: rows };
}

/**
 * Applies editor rows to a work's movement list: row order becomes the new
 * order, known ids are kept, new rows get ids, missing movements are dropped.
 */
export function mergeMovements<M>(
  current: WorkMovement[],
  rows: MovementRow<M>[],
  newId: () => string,
): { movements: WorkMovement[]; marks: MovementMarks<M> } {
  const known = new Set(current.map((m) => m.id));
  const marks: MovementMarks<M> = {};
  const movements = rows.map((row) => {
    const id = row.id && known.has(row.id) ? row.id : newId();
    if (row.mark !== null) marks[id] = row.mark;
    return { id, name: row.name };
  });
  return { movements, marks };
}

/** Movements this item has marked, sorted by start, numbered by the work. */
export function placeMovements(
  movements: WorkMovement[],
  marks: MovementMarks<number>,
): PlacedMovement[] {
  return movements
    .flatMap((m, i) =>
      marks[m.id] === undefined
        ? []
        : [{ id: m.id, label: movementLabel(m, i), start: marks[m.id] }],
    )
    .sort((a, b) => a.start - b.start);
}

/** Index of the placed movement containing `at`, or -1 before the first. */
export function currentMovementIndex(
  placed: PlacedMovement[],
  at: number,
): number {
  return placed.findLastIndex((m) => m.start <= at);
}

export function nextMovementStart(
  placed: PlacedMovement[],
  at: number,
): number | null {
  return placed.find((m) => m.start > at)?.start ?? null;
}

/**
 * Like a music player's back button: the start of the current movement, or
 * the previous movement when already at a movement's start.
 */
export function previousMovementStart(
  placed: PlacedMovement[],
  at: number,
): number | null {
  return placed.findLast((m) => m.start < at)?.start ?? null;
}

/** "7:21" → 441, "1:02:03" → 3723, "45" → 45; null if not a time. */
export function parseTimestamp(text: string): number | null {
  const parts = text.trim().split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const [seconds, ...higher] = parts.map(Number).reverse();
  if (higher.length > 0 && seconds > 59) return null;
  if (higher.length > 1 && higher[0] > 59) return null;
  return higher.reduce((total, n, i) => total + n * 60 ** (i + 1), seconds);
}

export function formatTimestamp(seconds: number): string {
  const s = Math.floor(seconds);
  const pad = (n: number) => String(n).padStart(2, "0");
  const [h, m, sec] = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60];
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

const NUMERALS: [number, string][] = [
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** Roman numeral for 1–100 (the most movements a work can have). */
export function toRoman(n: number): string {
  let out = "";
  for (const [value, numeral] of NUMERALS) {
    for (; n >= value; n -= value) out += numeral;
  }
  return out;
}

/** "II. Andante con moto" for the movement at `index` (0-based). */
export function movementLabel(movement: WorkMovement, index: number): string {
  return `${toRoman(index + 1)}. ${movement.name}`;
}
