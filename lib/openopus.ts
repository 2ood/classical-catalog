/**
 * Client for the Open Opus API (https://openopus.org): composers and their
 * complete work lists. Titles are parsed in lib/work-titles.ts.
 */
const API = "https://api.openopus.org";

/** Open Opus eras in chronological order. */
export const EPOCHS = [
  "Medieval",
  "Renaissance",
  "Baroque",
  "Classical",
  "Early Romantic",
  "Romantic",
  "Late Romantic",
  "20th Century",
  "Post-War",
  "21st Century",
];

export type OpenOpusComposer = {
  openOpusId: number;
  name: string; // short name, e.g. "Beethoven"
  completeName: string;
  born: number | null;
  died: number | null;
  epoch: string;
};

export type OpenOpusWork = {
  openOpusId: number;
  title: string;
  subtitle: string;
  genre: string; // Chamber, Keyboard, Orchestral, Stage or Vocal
  popular: boolean;
  recommended: boolean;
};

type RawComposer = {
  id: string;
  name: string;
  complete_name: string;
  birth: string | null;
  death: string | null;
  epoch: string;
};

type RawWork = {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  popular: string;
  recommended: string;
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`Open Opus responded ${res.status}`);
  const body = await res.json();
  if (body?.status?.success !== "true") {
    throw new Error(`Open Opus: ${body?.status?.error ?? "request failed"}`);
  }
  return body;
}

const year = (date: string | null) => (date ? Number(date.slice(0, 4)) : null);

function toComposer(raw: RawComposer): OpenOpusComposer {
  return {
    openOpusId: Number(raw.id),
    name: raw.name,
    completeName: raw.complete_name,
    born: year(raw.birth),
    died: year(raw.death),
    epoch: raw.epoch,
  };
}

/** Every composer Open Opus knows (~220), by short name. */
export async function fetchComposers(): Promise<OpenOpusComposer[]> {
  const body = await get<{ composers: RawComposer[] }>(
    "/composer/list/name/all.json",
  );
  return body.composers.map(toComposer);
}

/** A composer and their complete work list. */
export async function fetchComposerWorks(openOpusId: number): Promise<{
  composer: OpenOpusComposer;
  works: OpenOpusWork[];
}> {
  const body = await get<{ composer: RawComposer; works: RawWork[] }>(
    `/work/list/composer/${openOpusId}/genre/all.json`,
  );
  return {
    composer: toComposer(body.composer),
    works: body.works.map((w) => ({
      openOpusId: Number(w.id),
      title: w.title,
      subtitle: w.subtitle,
      genre: w.genre,
      popular: w.popular === "1",
      recommended: w.recommended === "1",
    })),
  };
}
