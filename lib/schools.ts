/**
 * Composers' schools and movements (Impressionism, The Five, …), shown as
 * "movements" on the home page. Called schools here because a work's
 * movements already are something else.
 */
import { plain } from "./import";

// Well-known schools by members' full names as Open Opus spells them.
const BUILT_IN: Record<string, string[]> = {
  "Notre-Dame School": ["Léonin", "Pérotin"],
  "Ars Nova": ["Guillaume de Machaut", "Philippe de Vitry"],
  "Franco-Flemish School": [
    "Guillaume Dufay",
    "Johannes Ockeghem",
    "Jacob Obrecht",
    "Josquin Des Prez",
    "Orlande de Lassus",
  ],
  "Mannheim School": ["Johann Stamitz", "Carl Stamitz"],
  "First Viennese School": [
    "Franz Joseph Haydn",
    "Wolfgang Amadeus Mozart",
    "Ludwig van Beethoven",
  ],
  "New German School": ["Franz Liszt", "Richard Wagner"],
  "The Five": [
    "Mily Balakirev",
    "César Cui",
    "Modest Mussorgsky",
    "Alexander Borodin",
    "Nikolai Rimsky-Korsakov",
  ],
  Nationalism: [
    "Mikhail Ivanovich Glinka",
    "Bedrich Smetana",
    "Antonín Dvořák",
    "Edvard Grieg",
    "Jean Sibelius",
    "Isaac Albéniz",
    "Enrique Granados",
    "Manuel de Falla",
    "Leoš Janáček",
    "Béla Bartók",
    "Zoltán Kodály",
  ],
  Impressionism: ["Claude Debussy", "Maurice Ravel", "Paul Dukas"],
  "Second Viennese School": ["Arnold Schoenberg", "Alban Berg", "Anton Webern"],
  "Les Six": [
    "Georges Auric",
    "Louis Durey",
    "Arthur Honegger",
    "Darius Milhaud",
    "Francis Poulenc",
    "Germaine Tailleferre",
  ],
  Neoclassicism: ["Igor Stravinsky", "Paul Hindemith"],
  "Darmstadt School": ["Pierre Boulez", "Karlheinz Stockhausen", "Luigi Nono"],
  Minimalism: [
    "Terry Riley",
    "Steve Reich",
    "Philip Glass",
    "John Adams",
    "Arvo Pärt",
  ],
};

const MEMBERS = new Map<string, string[]>();
for (const [school, names] of Object.entries(BUILT_IN)) {
  for (const name of names) {
    MEMBERS.set(plain(name), [...(MEMBERS.get(plain(name)) ?? []), school]);
  }
}

/** The built-in schools a composer (by full name) belongs to. */
export function builtInSchools(completeName: string): string[] {
  return MEMBERS.get(plain(completeName)) ?? [];
}

// Wikidata labels that only restate the period (the period view has those).
const PERIOD_LIKE = new Set(
  [
    "medieval music",
    "renaissance music",
    "baroque music",
    "classical period",
    "classical music",
    "romantic music",
    "romanticism",
    "modernism",
    "modern music",
    "20th century classical music",
    "21st century classical music",
    "contemporary classical music",
    "post romanticism",
  ].map(plain),
);

const RENAMED: Record<string, string> = {
  [plain("impressionism in music")]: "Impressionism",
  [plain("musical impressionism")]: "Impressionism",
  [plain("minimal music")]: "Minimalism",
  [plain("minimalism")]: "Minimalism",
  [plain("musical nationalism")]: "Nationalism",
  [plain("romantic nationalism")]: "Nationalism",
  [plain("expressionist music")]: "Expressionism",
  [plain("neoclassicism music")]: "Neoclassicism",
};

/**
 * A Wikidata "movement" label as a school name, or null when it only
 * restates the period ("Romantic music").
 */
export function cleanSchool(label: string): string | null {
  const key = plain(label);
  if (PERIOD_LIKE.has(key)) return null;
  if (RENAMED[key]) return RENAMED[key];
  const name = label.replace(/\s*\((music|composers)\)$/i, "").trim();
  return name[0].toUpperCase() + name.slice(1);
}

const MAX_SCHOOLS = 20;
const MAX_NAME = 60;

/** Validates `{ schools: string[] }` from the composer page's editor. */
export function parseSchools(
  body: unknown,
): { ok: true; value: string[] } | { ok: false; error: string } {
  const list = (body as { schools?: unknown } | null)?.schools;
  if (!Array.isArray(list)) return { ok: false, error: "Expected a list" };
  const seen = new Set<string>();
  const schools: string[] = [];
  for (const item of list) {
    const name = String(item ?? "").trim();
    if (!name || seen.has(plain(name))) continue;
    if (name.length > MAX_NAME) {
      return {
        ok: false,
        error: `Names must be at most ${MAX_NAME} characters`,
      };
    }
    seen.add(plain(name));
    schools.push(name);
  }
  if (schools.length > MAX_SCHOOLS) {
    return { ok: false, error: `At most ${MAX_SCHOOLS} movements` };
  }
  return { ok: true, value: schools };
}
