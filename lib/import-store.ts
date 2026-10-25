import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { matchComposer, planImport } from "./import";
import { fetchArtistWorks, matchMovements, parentsFrom } from "./musicbrainz";
import type { fetchComposerWorks, OpenOpusComposer } from "./openopus";
import { seedSchools } from "./school-store";
import { composerSchools, composers, works } from "./schema";
import { slugify, uniqueSlug } from "./slugs";

/** "brahms"; the full name when another composer has that short name. */
function composerSlug(composer: OpenOpusComposer, taken: Set<string>) {
  const short = slugify(composer.name);
  if (!taken.has(short)) return short;
  return uniqueSlug(slugify(composer.completeName), taken);
}

const noMovements = sql`${works.movements} = '[]'::jsonb`;

/** See lib/school-store.ts. */
export function importSchools(
  composerId: string,
  completeName: string,
  artistId: string | null,
) {
  return seedSchools(db, composerId, completeName, artistId);
}

/** Replaces a composer's schools (the composer page's editor). */
export function saveSchools(composerId: string, names: string[]) {
  return db.transaction(async (tx) => {
    await tx
      .delete(composerSchools)
      .where(eq(composerSchools.composerId, composerId));
    if (names.length > 0) {
      await tx
        .insert(composerSchools)
        .values(names.map((name) => ({ composerId, name })));
    }
  });
}

/**
 * Fills in movement lists from MusicBrainz (artist `artistId`) for the
 * composer's works that have none yet (lists entered by hand are never
 * replaced). Returns how many works got movements.
 */
export async function importMovements(
  artistId: string,
  composerId: string,
  onPage: (done: number, total: number) => void,
): Promise<number> {
  const parents = parentsFrom(await fetchArtistWorks(artistId, onPage));

  const bare = await db
    .select({
      id: works.id,
      title: works.title,
      catalogueNum: works.catalogueNum,
    })
    .from(works)
    .where(and(eq(works.composerId, composerId), noMovements));
  const found = matchMovements(bare, parents);

  await db.transaction(async (tx) => {
    for (const [workId, names] of found) {
      const movements = names.map((name) => ({ id: randomUUID(), name }));
      await tx
        .update(works)
        .set({ movements })
        .where(and(eq(works.id, workId), noMovements));
    }
  });
  return found.size;
}

/**
 * Saves an Open Opus composer and their works: links or adds the composer
 * (filling only blank details of one entered by hand), then adds new works
 * and links hand-entered ones, all in one transaction.
 */
export function importComposer({
  composer,
  works: incoming,
}: Awaited<ReturnType<typeof fetchComposerWorks>>) {
  return db.transaction(async (tx) => {
    const locals = await tx.select().from(composers);
    const localId = matchComposer(locals, composer);
    const local = locals.find((c) => c.id === localId);

    let composerId: string;
    if (local) {
      composerId = local.id;
      await tx
        .update(composers)
        .set({
          openOpusId: composer.openOpusId,
          born: local.born ?? composer.born,
          died: local.died ?? composer.died,
          era: local.era ?? composer.epoch,
        })
        .where(eq(composers.id, composerId));
    } else {
      [{ id: composerId }] = await tx
        .insert(composers)
        .values({
          name: composer.completeName,
          shortName: composer.name,
          slug: composerSlug(composer, new Set(locals.map((c) => c.slug))),
          born: composer.born,
          died: composer.died,
          era: composer.epoch,
          openOpusId: composer.openOpusId,
        })
        .returning({ id: composers.id });
    }

    const existing = await tx
      .select({
        id: works.id,
        catalogueNum: works.catalogueNum,
        title: works.title,
        slug: works.slug,
        openOpusId: works.openOpusId,
      })
      .from(works)
      .where(eq(works.composerId, composerId));
    const { inserts, links } = planImport(existing, incoming);

    if (inserts.length > 0) {
      await tx.insert(works).values(inserts.map((w) => ({ ...w, composerId })));
    }
    for (const { workId, ...link } of links) {
      await tx.update(works).set(link).where(eq(works.id, workId));
    }
    return { composerId, added: inserts.length, linked: links.length };
  });
}
