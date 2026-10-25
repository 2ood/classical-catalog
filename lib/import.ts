import type { OpenOpusComposer, OpenOpusWork } from "./openopus";
import { uniqueSlug, workSlug } from "./slugs";
import {
  genreFromTitle,
  normalizeCatalogue,
  parseWorkTitle,
} from "./work-titles";

/** A work as the works table stores it (composer id added on insert). */
export type ImportedWork = {
  openOpusId: number;
  title: string;
  slug: string;
  catalogueNum: string | null;
  key: string | null;
  genre: string;
  popular: boolean;
  recommended: boolean;
};

export type ExistingWork = {
  id: string;
  catalogueNum: string | null;
  title: string;
  slug: string;
  openOpusId: number | null;
};

export type WorkLink = {
  workId: string;
  openOpusId: number;
  popular: boolean;
  recommended: boolean;
};

/** Lowercase, without accents, quotes or punctuation, for comparing names. */
export const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * Sorts a composer's Open Opus works into new works to insert and works
 * entered by hand to link (same catalogue number, or same title when
 * neither has one). Works imported before are left alone. New works get
 * slugs not yet taken by the composer.
 */
export function planImport(
  existing: ExistingWork[],
  incoming: OpenOpusWork[],
): { inserts: ImportedWork[]; links: WorkLink[] } {
  const imported = new Set(existing.map((w) => w.openOpusId));
  const byCatalogue = new Map<string, ExistingWork>();
  const byTitle = new Map<string, ExistingWork>();
  for (const w of existing) {
    if (w.openOpusId !== null) continue;
    if (w.catalogueNum) byCatalogue.set(normalizeCatalogue(w.catalogueNum), w);
    else byTitle.set(plain(w.title), w);
  }
  const linked = new Set<string>();
  const slugs = new Set(existing.map((w) => w.slug));

  const inserts: ImportedWork[] = [];
  const links: WorkLink[] = [];
  for (const oo of incoming) {
    if (imported.has(oo.openOpusId)) continue;
    const { title, key, catalogueNums } = parseWorkTitle(oo.title);
    const flags = { popular: oo.popular, recommended: oo.recommended };

    const match = catalogueNums.length
      ? catalogueNums
          .map((c) => byCatalogue.get(normalizeCatalogue(c)))
          .find((w) => w && !linked.has(w.id))
      : byTitle.get(plain(title));
    if (match && !linked.has(match.id)) {
      linked.add(match.id);
      links.push({ workId: match.id, openOpusId: oo.openOpusId, ...flags });
      continue;
    }

    const catalogueNum = catalogueNums[0] ?? null;
    const slug = uniqueSlug(workSlug({ title, catalogueNum }), slugs);
    slugs.add(slug);
    inserts.push({
      openOpusId: oo.openOpusId,
      title,
      slug,
      catalogueNum,
      key,
      genre: genreFromTitle(title, oo.subtitle, oo.genre),
      ...flags,
    });
  }
  return { inserts, links };
}

/**
 * The local composer for an Open Opus composer: imported before (same id),
 * or entered by hand under the same full name and not yet linked.
 */
export function matchComposer(
  locals: { id: string; name: string; openOpusId: number | null }[],
  composer: OpenOpusComposer,
): string | undefined {
  return (
    locals.find((c) => c.openOpusId === composer.openOpusId) ??
    locals.find(
      (c) =>
        c.openOpusId === null && plain(c.name) === plain(composer.completeName),
    )
  )?.id;
}
