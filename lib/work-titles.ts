/**
 * Splits Open Opus work titles ("Piano Sonata no. 14 in C sharp minor,
 * op. 27 no. 2, \"Moonlight\"") into the parts our works table keeps.
 */
export type ParsedTitle = {
  title: string;
  key: string | null;
  /** Every catalogue number in the title, the one to show first. */
  catalogueNums: string[];
};

// "1080", "605a", "Anh.214", "XVII:D2", "258-261", "339/R635", "26 no. 4"
const NUMBER = String.raw`([Aa]nh\.\s*)?([A-Za-z]*(?::\s*[A-Za-z]*)?\d\w*(?:[-/][A-Za-z.]*\d\w*)*)(?:,?\s*no\.\s*(\d+\w*))?`;

// In order of preference: a composer's own catalogue beats an opus number,
// which beats secondary catalogues (Burghauser, Lesure, Raabe, …).
const CATALOGUES: { pattern: string; label: string }[] = [
  { pattern: String.raw`BWV\.?\s*`, label: "BWV" },
  { pattern: String.raw`HWV\.?\s*`, label: "HWV" },
  { pattern: String.raw`K(?:\.\s*|(?=\d))`, label: "K." },
  { pattern: String.raw`D(?:\.\s*|(?=\d))`, label: "D." },
  { pattern: String.raw`Hob\.?\s*`, label: "Hob." },
  { pattern: String.raw`RV\.?\s*`, label: "RV" },
  { pattern: String.raw`S(?:\.\s*|(?=\d))`, label: "S." },
  { pattern: "op", label: "Op." }, // see OPUS
  { pattern: String.raw`WoO\.?\s*`, label: "WoO" },
  { pattern: String.raw`Sz\.?\s*`, label: "Sz." },
  { pattern: String.raw`BB\.?\s*`, label: "BB" },
  { pattern: String.raw`B(?:\.\s*|(?=\d))`, label: "B." },
  { pattern: String.raw`L(?:\.\s*|(?=\d))`, label: "L." },
  { pattern: String.raw`R(?:\.\s*|(?=\d))`, label: "R." },
  { pattern: String.raw`DD\.?\s*`, label: "DD" },
];

const OPUS =
  /\bop\.?\s*(posth\.?\s*)?(\d+[a-z]*)(?:,?\s*no\.\s*(\d+[a-z]*))?/gi;

type Found = { start: number; end: number; rank: number; label: string };

function findCatalogues(s: string): Found[] {
  const found: Found[] = [];
  CATALOGUES.forEach(({ pattern, label }, rank) => {
    if (label === "Op.") {
      for (const m of s.matchAll(OPUS)) {
        const posth = m[1] ? "posth. " : "";
        const no = m[3] ? ` No. ${m[3]}` : "";
        found.push({
          start: m.index,
          end: m.index + m[0].length,
          rank,
          label: `Op. ${posth}${m[2]}${no}`,
        });
      }
      return;
    }
    for (const m of s.matchAll(
      new RegExp(String.raw`\b${pattern}${NUMBER}`, "g"),
    )) {
      const anh = m[1] ? "Anh. " : "";
      const no = m[3] ? ` No. ${m[3]}` : "";
      found.push({
        start: m.index,
        end: m.index + m[0].length,
        rank,
        label: `${label} ${anh}${m[2]}${no}`,
      });
    }
  });

  // Drop matches inside an earlier one ("S45" in Scarlatti's "L.S45").
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  return found.filter(
    (f, i) => !found.slice(0, i).some((g) => f.start < g.end),
  );
}

const KEY =
  /(?:,\s*|\s+)in ([A-G])(?:[\s-](flat|sharp))?(?:\s+(major|minor))?(?=,|$)/;

export function parseWorkTitle(raw: string): ParsedTitle {
  let s = raw.replace(/\s+/g, " ").trim();

  const found = findCatalogues(s);
  // Cut from the end so earlier positions stay valid.
  for (const f of [...found].reverse()) {
    s =
      s.slice(0, f.start).replace(/(?:[,;]\s*|\s+and\s+|\s+)$/, "") +
      s.slice(f.end);
  }

  const nickname = s.match(/,?\s*"([^"]+)"$/);
  if (nickname) s = s.slice(0, nickname.index);

  let key: string | null = null;
  const k = s.match(KEY);
  if (k) {
    key = `${k[1]}${k[2] ? `-${k[2]}` : ""} ${k[3] ?? "major"}`;
    s = s.slice(0, k.index) + s.slice(k.index! + k[0].length);
  }

  let title = s
    .replace(/\bno\.\s*(?=\d)/gi, "No. ")
    .replace(/"([^"]*)"/g, "“$1”")
    .replace(/[\s,;]+$/, "")
    .trim();
  if (nickname) title += ` “${nickname[1]}”`;

  const catalogueNums = found
    .sort((a, b) => a.rank - b.rank || a.start - b.start)
    .map((f) => f.label);
  return { title, key, catalogueNums };
}

/** Comparable form of a catalogue number: "Op. 27 No. 2" → "op27no2". */
export function normalizeCatalogue(catalogueNum: string): string {
  return catalogueNum.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const SOLO =
  "Piano|Violin|Viola|Cello|Flute|Oboe|Clarinet|Bassoon|Horn|Trumpet|Organ|Harpsichord|Keyboard|Recorder";

// A form name and the genre it gives. The form named first in a title wins.
const FORMS: [string, string | ((m: RegExpMatchArray) => string)][] = [
  [
    `(?:(${SOLO})\\s+)?Concertos?`,
    (m) => (m[1] ? `${cap(m[1])} Concerto` : "Concerto"),
  ],
  [
    `(?:(${SOLO}|Trio)\\s+)?Sonatas?`,
    (m) => (m[1] ? `${cap(m[1])} Sonata` : "Sonata"),
  ],
  [
    "(String|Piano)\\s+(Trio|Quartet|Quintet|Sextet|Octet)s?",
    (m) => `${cap(m[1])} ${cap(m[2])}`,
  ],
  ["Symphon(?:y|ies)", "Symphony"],
  ["Mass(?:es)?|Missa", "Mass"],
  ["Requiem", "Requiem"],
  ["Cantatas?", "Cantata"],
  ["Oratorios?", "Oratorio"],
  ["Operas?", "Opera"],
  ["Ballets?", "Ballet"],
  ["Overtures?", "Overture"],
  ["Serenades?", "Serenade"],
  ["Divertiment[oi]", "Divertimento"],
  ["Variations", "Variations"],
  ["Suites?", "Suite"],
  ["Pr[ée]ludes? and Fugues?", "Prelude and Fugue"],
  ["Pr[ée]ludes?", "Prelude"],
  ["[ÉE]tudes?", "Étude"],
  ["Nocturnes?", "Nocturne"],
  ["Mazurkas?", "Mazurka"],
  ["Waltz(?:es)?|Valses?", "Waltz"],
  ["Polonaises?", "Polonaise"],
  ["Ballades?", "Ballade"],
  ["Impromptus?", "Impromptu"],
  ["Scherz(?:o|os|i)", "Scherzo"],
];

const FORM_PATTERNS = FORMS.map(
  ([pattern, genre]) =>
    [new RegExp(`(?<!\\p{L})(?:${pattern})(?!\\p{L})`, "iu"), genre] as const,
);

function cap(word: string): string {
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

function formIn(text: string): string | null {
  let best: { index: number; genre: string } | null = null;
  for (const [pattern, genre] of FORM_PATTERNS) {
    const m = text.match(pattern);
    if (m && (!best || m.index! < best.index)) {
      best = {
        index: m.index!,
        genre: typeof genre === "string" ? genre : genre(m),
      };
    }
  }
  return best?.genre ?? null;
}

/**
 * The work's form (Symphony, Piano Sonata, Opera, …) from its parsed title,
 * then its Open Opus subtitle, else Open Opus' broad genre (`fallback`).
 */
export function genreFromTitle(
  title: string,
  subtitle: string,
  fallback: string,
): string {
  const withoutNickname = title.replace(/“[^”]*”/g, "");
  return formIn(withoutNickname) ?? formIn(subtitle) ?? fallback;
}
