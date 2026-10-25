/**
 * Movements from MusicBrainz (https://musicbrainz.org), where a work's
 * movements, or a collection's pieces, are works linked to it as "parts".
 * MusicBrainz allows about one request per second per client.
 */
import { plain } from "./import";
import { normalizeCatalogue, parseWorkTitle } from "./work-titles";

const API = "https://musicbrainz.org/ws/2";
const USER_AGENT =
  "classical-catalog/0.1 ( https://github.com/2ood/classical-catalog )";
const PAGE = 100;
const INTERVAL_MS = 1000;
const ATTEMPTS = 3;

type Relation = {
  type: string;
  direction: string;
  "ordering-key"?: number;
  work?: { id: string; title: string };
};

export type MbWork = { id: string; title: string; relations?: Relation[] };

/** A work with its movement names in order. */
export type MbParent = { title: string; movements: string[] };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function get<T>(
  path: string,
  wait: (ms: number) => Promise<void>,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (res.ok) return await res.json();
      if (attempt === ATTEMPTS) {
        throw new Error(`MusicBrainz responded ${res.status}`);
      }
    } catch (error) {
      if (attempt === ATTEMPTS) throw error;
    }
    await wait(2000 * attempt); // rate-limited (503) or unreachable
  }
}

/** The composer's MusicBrainz id: same name, and same birth year if known. */
export async function findArtist(
  completeName: string,
  born: number | null,
  wait: (ms: number) => Promise<void> = sleep,
): Promise<string | null> {
  // Unfielded, so aliases and the sort name count: MusicBrainz names some
  // composers in their own script ("Сергей Васильевич Рахманинов").
  const terms = completeName.replace(/[^\p{L}\p{N}\s]/gu, " ");
  const query = encodeURIComponent(`(${terms}) AND type:person`);
  const body = await get<{ artists: MbArtist[] }>(
    `/artist/?query=${query}&limit=25&fmt=json`,
    wait,
  );

  const wanted = plain(completeName).split(" ");
  const named = body.artists.filter((a) =>
    [a.name, a["sort-name"], ...(a.aliases ?? []).map((x) => x.name)].some(
      (name) => {
        // Every word of the name, in any order ("Rachmaninoff, Sergei …").
        const words = new Set(plain(name ?? "").split(" "));
        return wanted.every((w) => words.has(w));
      },
    ),
  );
  const begin = (a: MbArtist) => Number(a["life-span"]?.begin?.slice(0, 4));
  // Birth years tell namesakes apart; when none agrees (early composers'
  // dates differ between sources), the only person of that name will do.
  const match =
    named.find((a) => born && Math.abs(begin(a) - born) <= 1) ??
    named.find((a) => !born || !a["life-span"]?.begin) ??
    (named.length === 1 ? named[0] : undefined);
  return match?.id ?? null;
}

type MbArtist = {
  id: string;
  name: string;
  "sort-name"?: string;
  aliases?: { name: string }[];
  "life-span"?: { begin?: string };
};

/** The artist's Wikidata item ("Q4700"), from their MusicBrainz links. */
export async function wikidataIdOf(
  artistId: string,
  wait: (ms: number) => Promise<void> = sleep,
): Promise<string | null> {
  const body = await get<{
    relations?: { type: string; url?: { resource: string } }[];
  }>(`/artist/${artistId}?inc=url-rels&fmt=json`, wait);
  const link = body.relations?.find((r) => r.type === "wikidata");
  return link?.url?.resource.match(/Q\d+$/)?.[0] ?? null;
}

/**
 * Every work linked to the artist, with its part links, one page per
 * second; `onPage(done, total)` reports progress in pages.
 */
export async function fetchArtistWorks(
  artistId: string,
  onPage: (done: number, total: number) => void = () => {},
  wait: (ms: number) => Promise<void> = sleep,
): Promise<MbWork[]> {
  const works: MbWork[] = [];
  for (let offset = 0, page = 1; ; offset += PAGE, page++) {
    const started = Date.now();
    const body = await get<{ "work-count": number; works: MbWork[] }>(
      `/work?artist=${artistId}&inc=work-rels&limit=${PAGE}&offset=${offset}&fmt=json`,
      wait,
    );
    works.push(...body.works);
    const pages = Math.ceil(body["work-count"] / PAGE);
    onPage(page, pages);
    if (page >= pages) return works;
    await wait(Math.max(0, INTERVAL_MS - (Date.now() - started)));
  }
}

const NUMBERING = String.raw`(?:[IVXLC]+|\d+|(?:[Nn]r|[Nn]o)\.?\s*\d+\w*)`;
// "…: II. Andante" — a movement, not a whole work.
const SECTION = new RegExp(String.raw`:\s*${NUMBERING}\b`);
const ARRANGEMENT = /\barr\.|arranged|version|transcri|, S\. \d/i;

/** The first ": " outside quotes, or -1. */
function colonOutsideQuotes(s: string): number {
  let quoted = false;
  for (let i = 0; i < s.length - 1; i++) {
    if (s[i] === '"' || s[i] === "“" || s[i] === "”") quoted = !quoted;
    else if (!quoted && s[i] === ":" && s[i + 1] === " ") return i;
  }
  return -1;
}

/** "Symphony no. 5 …, op. 67: II. Andante con moto" → "Andante con moto" */
export function movementName(partTitle: string, parentTitle: string): string {
  let name = partTitle;
  if (name.startsWith(`${parentTitle}:`)) {
    name = name.slice(parentTitle.length + 1);
  } else if (colonOutsideQuotes(name) >= 0) {
    name = name.slice(colonOutsideQuotes(name) + 1);
  } else {
    // "26 Welsh Songs WoO 155, No. 1, …" or "12 Deutsche Tänze WoO 13 No. 1 …"
    name =
      name.match(/(?:,\s*|\s)((?:[Nn]r|[Nn]o)\.?\s*\d+\w*.*)$/)?.[1] ?? name;
  }
  return name
    .trim()
    .replace(new RegExp(String.raw`^${NUMBERING}[.,]\s+`), "")
    .replace(/^["“]([^"“”]*)["”]$/, "$1")
    .replace(/"([^"]*)"/g, "“$1”");
}

/**
 * Works with at least two parts, minus arrangements and sections that have
 * parts of their own, with movement names in MusicBrainz' order.
 */
export function parentsFrom(works: MbWork[]): MbParent[] {
  return works
    .filter((w) => !SECTION.test(w.title) && !ARRANGEMENT.test(w.title))
    .map((w) => ({
      title: w.title,
      movements: (w.relations ?? [])
        .filter(
          (r) => r.type === "parts" && r.direction === "forward" && r.work,
        )
        .sort(
          (a, b) =>
            (a["ordering-key"] ?? Infinity) - (b["ordering-key"] ?? Infinity),
        )
        .map((r) => movementName(r.work!.title, w.title)),
    }))
    .filter((p) => p.movements.length >= 2);
}

/**
 * Movement names per work id, matched by catalogue number (or by title when
 * the work has none). MusicBrainz often holds a work several times; the most
 * common number of movements wins.
 */
export function matchMovements(
  works: { id: string; title: string; catalogueNum: string | null }[],
  parents: MbParent[],
): Map<string, string[]> {
  const byCatalogue = new Map<string, MbParent[]>();
  const byTitle = new Map<string, MbParent[]>();
  const add = (map: Map<string, MbParent[]>, key: string, p: MbParent) =>
    map.set(key, [...(map.get(key) ?? []), p]);
  for (const p of parents) {
    const parsed = parseWorkTitle(p.title);
    for (const c of parsed.catalogueNums) {
      add(byCatalogue, normalizeCatalogue(c), p);
    }
    add(byTitle, plain(parsed.title), p);
  }

  const result = new Map<string, string[]>();
  for (const w of works) {
    const candidates = w.catalogueNum
      ? byCatalogue.get(normalizeCatalogue(w.catalogueNum))
      : byTitle.get(plain(w.title));
    if (!candidates) continue;

    const counts = new Map<number, number>();
    for (const c of candidates) {
      counts.set(c.movements.length, (counts.get(c.movements.length) ?? 0) + 1);
    }
    const [[length]] = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    result.set(
      w.id,
      candidates.find((c) => c.movements.length === length)!.movements,
    );
  }
  return result;
}
