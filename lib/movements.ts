/** `name` is usually the tempo marking; the number comes from the order. */
export type Movement = { name: string; page: number };

const MAX_MOVEMENTS = 100;
const MAX_NAME = 200;

type Result = { ok: true; value: Movement[] } | { ok: false; error: string };

/** Validates a movement list from a request body; returns it sorted by page. */
export function parseMovements(body: unknown): Result {
  if (!Array.isArray(body)) {
    return { ok: false, error: "Expected a list of movements" };
  }
  if (body.length > MAX_MOVEMENTS) {
    return { ok: false, error: `At most ${MAX_MOVEMENTS} movements` };
  }

  const movements: Movement[] = [];
  for (const item of body) {
    const name = String(item?.name ?? "").trim();
    if (!name || name.length > MAX_NAME) {
      return { ok: false, error: `Names must be 1–${MAX_NAME} characters` };
    }
    const page = Number(item?.page);
    if (!Number.isInteger(page) || page < 1) {
      return { ok: false, error: "Start pages must be whole numbers from 1" };
    }
    movements.push({ name, page });
  }
  return { ok: true, value: movements.sort((a, b) => a.page - b.page) };
}

/** Index of the movement containing `page` (movements sorted), or -1. */
export function currentMovementIndex(
  movements: Movement[],
  page: number,
): number {
  return movements.findLastIndex((m) => m.page <= page);
}

export function nextMovementPage(
  movements: Movement[],
  page: number,
): number | null {
  return movements.find((m) => m.page > page)?.page ?? null;
}

/**
 * Like a music player's back button: the start of the current movement, or
 * the previous movement when already on a movement's first page.
 */
export function previousMovementPage(
  movements: Movement[],
  page: number,
): number | null {
  return movements.findLast((m) => m.page < page)?.page ?? null;
}

const NUMERALS: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
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

export function toRoman(n: number): string {
  let out = "";
  for (const [value, numeral] of NUMERALS) {
    for (; n >= value; n -= value) out += numeral;
  }
  return out;
}

/** "II. Andante con moto" for the movement at `index` (0-based). */
export function movementLabel(movement: Movement, index: number): string {
  return `${toRoman(index + 1)}. ${movement.name}`;
}
