/**
 * Performers behind a recording's performer text ("Karajan / BPO (cycle)").
 * The text stays as typed; each " / " part names a performer, found by name
 * or alias, so merged and renamed performers keep resolving.
 */
import { plain } from "./import";

export const KINDS = ["person", "orchestra", "choir", "ensemble"] as const;
export type PerformerKind = (typeof KINDS)[number];

/** "Karajan / BPO (cycle)" → ["Karajan", "BPO"] (notes in parentheses aren't names). */
export function splitPerformers(text: string): string[] {
  const seen = new Set<string>();
  return text
    .replace(/\([^)]*\)/g, " ")
    .split("/")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => {
      const key = performerKey(part);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** How names are compared: case, accents, hyphens and spacing ignored. */
export function performerKey(name: string): string {
  return plain(name).replace(/\s+/g, "");
}

const CHOIR =
  /\b(chorus|choir|chor|choeur|coro|singverein|singers|voices|cantores)\b/i;
const ORCHESTRA =
  /\b(orchestra|orchestre|orchester|orquesta|orchestr\w*|philharmonic|philharmoniker|philharmonie|filarmonica|symphony|symphoniker|sinfonia|sinfonica|sinfonietta|staatskapelle|kapelle|camerata)\b/i;
const ENSEMBLE =
  /\b(ensemble|quartet|quartett|quintet|trio|consort|players|soloists|band)\b/i;

/** A first guess at what a name is; the performer page can correct it. */
export function guessKind(name: string): PerformerKind {
  const words = plain(name);
  if (CHOIR.test(words)) return "choir";
  if (ORCHESTRA.test(words)) return "orchestra";
  if (ENSEMBLE.test(words)) return "ensemble";
  // "BPO", "LSO", "RCO": abbreviations are almost always orchestras.
  if (/^[A-Z]{2,4}$/.test(name.trim())) return "orchestra";
  return "person";
}

/**
 * Each part's performer id, by name or alias; null where a new performer
 * is needed — those names are listed once each in `created`.
 */
export function resolvePerformers(
  parts: string[],
  known: { id: string; name: string; aliases: string[] }[],
): { ids: (string | null)[]; created: string[] } {
  const byKey = new Map<string, string>();
  for (const p of known) {
    for (const name of [p.name, ...p.aliases])
      byKey.set(performerKey(name), p.id);
  }
  const created: string[] = [];
  const createdKeys = new Set<string>();
  const ids: (string | null)[] = [];
  for (const part of parts) {
    const key = performerKey(part);
    const id = byKey.get(key);
    if (id) {
      if (!ids.includes(id)) ids.push(id);
      continue;
    }
    if (!createdKeys.has(key)) {
      createdKeys.add(key);
      created.push(part);
      ids.push(null);
    }
  }
  return { ids, created };
}

const MAX_NAME = 120;

/**
 * A person's instrument or role, chosen from this list; its order (conductor,
 * keyboards, strings, winds and brass, voices) is the order of the groups.
 */
export const INSTRUMENTS = [
  "Conductor",
  "Piano",
  "Harpsichord",
  "Organ",
  "Violin",
  "Viola",
  "Cello",
  "Double bass",
  "Viola da gamba",
  "Guitar",
  "Lute",
  "Harp",
  "Flute",
  "Recorder",
  "Oboe",
  "Clarinet",
  "Bassoon",
  "Saxophone",
  "Horn",
  "Trumpet",
  "Trombone",
  "Tuba",
  "Percussion",
  "Soprano",
  "Mezzo-soprano",
  "Contralto",
  "Countertenor",
  "Tenor",
  "Baritone",
  "Bass",
];

type PerformerEdit = {
  name?: string;
  kind?: PerformerKind;
  instrument?: string | null;
};

/** Validates an edit from the performer page; only the sent fields change. */
export function parsePerformerEdit(
  body: unknown,
): { ok: true; value: PerformerEdit } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Expected a JSON object" };
  }
  const input = body as Record<string, unknown>;
  const value: PerformerEdit = {};
  if (input.name !== undefined) {
    const name = String(input.name).replace(/\s+/g, " ").trim();
    if (!name || name.length > MAX_NAME) {
      return { ok: false, error: `Names must be 1–${MAX_NAME} characters` };
    }
    value.name = name;
  }
  if (input.kind !== undefined) {
    if (!KINDS.includes(input.kind as PerformerKind)) {
      return { ok: false, error: "Unknown kind" };
    }
    value.kind = input.kind as PerformerKind;
  }
  if (input.instrument !== undefined) {
    const instrument = String(input.instrument ?? "").trim();
    if (instrument && !INSTRUMENTS.includes(instrument)) {
      return { ok: false, error: "Unknown instrument or role" };
    }
    value.instrument = instrument || null;
  }
  return { ok: true, value };
}

/**
 * People grouped by instrument or role, in the order of `INSTRUMENTS`;
 * people without one last, as "Other".
 */
export function byInstrument<T extends { instrument: string | null }>(
  people: T[],
): { name: string; performers: T[] }[] {
  const rank = (instrument: string | null) => {
    const i = instrument ? INSTRUMENTS.indexOf(instrument) : -1;
    return i === -1 ? INSTRUMENTS.length : i;
  };
  const groups = new Map<number, { name: string; performers: T[] }>();
  for (const person of people) {
    const r = rank(person.instrument);
    const group = groups.get(r) ?? {
      name: r === INSTRUMENTS.length ? "Other" : INSTRUMENTS[r],
      performers: [],
    };
    group.performers.push(person);
    groups.set(r, group);
  }
  return [...groups].sort(([a], [b]) => a - b).map(([, group]) => group);
}
