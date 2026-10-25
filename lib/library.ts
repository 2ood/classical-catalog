import type { OpenOpusComposer } from "./openopus";
import { builtInSchools } from "./schools";

type LocalComposer = {
  id: string;
  openOpusId: number | null;
  slug: string;
  era: string | null;
  born: number | null;
  died: number | null;
  recordedWorks: number;
  schools: string[];
};

/** A composer as the Library's map views draw them. */
export type MapComposer = {
  id: string;
  slug: string;
  shortName: string;
  era: string | null;
  born: number | null;
  died: number | null;
  recordedWorks: number;
  schools: string[];
  href: string;
  /** Not imported yet. */
  muted: boolean;
};

/**
 * Every Open Opus composer for the Library's views: imported ones with
 * their own details and page; the rest faded, with their built-in schools,
 * linking to the list filtered to them (where their Import button is).
 */
export function mapComposers(
  catalogue: OpenOpusComposer[],
  locals: LocalComposer[],
): MapComposer[] {
  const byOpenOpusId = new Map(locals.map((c) => [c.openOpusId, c]));
  return catalogue.map((c) => {
    const local = byOpenOpusId.get(c.openOpusId);
    if (local) {
      return {
        id: local.id,
        slug: local.slug,
        shortName: c.name,
        era: local.era,
        born: local.born,
        died: local.died,
        recordedWorks: local.recordedWorks,
        schools: local.schools,
        href: `/composer/${local.slug}`,
        muted: false,
      };
    }
    return {
      id: `openopus-${c.openOpusId}`,
      slug: "",
      shortName: c.name,
      era: c.epoch,
      born: c.born,
      died: c.died,
      recordedWorks: 0,
      schools: builtInSchools(c.completeName),
      href: `/library?q=${encodeURIComponent(c.completeName)}`,
      muted: true,
    };
  });
}
