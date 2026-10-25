import { eq } from "drizzle-orm";
import type { db } from "./db";
import { wikidataIdOf } from "./musicbrainz";
import { composerSchools, composers } from "./schema";
import { builtInSchools, parseSchools } from "./schools";
import { wikidataSchools } from "./wikidata";

/**
 * Gives a composer without schools their built-in ones plus Wikidata's
 * (through the MusicBrainz artist's Wikidata link, when known). Schools
 * already set, by hand or before, are left alone. Returns how many were
 * added; Wikidata being unreachable only means fewer.
 */
export async function seedSchools(
  database: typeof db,
  composerId: string,
  completeName: string,
  artistId: string | null,
): Promise<number> {
  const existing = await database
    .select({ name: composerSchools.name })
    .from(composerSchools)
    .where(eq(composerSchools.composerId, composerId));
  if (existing.length > 0) return 0;

  const qid = artistId ? await wikidataIdOf(artistId).catch(() => null) : null;
  const fromWikidata = qid ? await wikidataSchools(qid).catch(() => []) : [];
  const schools = parseSchools({
    schools: [...builtInSchools(completeName), ...fromWikidata],
  });
  const names = schools.ok ? schools.value : [];

  await database.transaction(async (tx) => {
    if (qid) {
      await tx
        .update(composers)
        .set({ wikidataId: qid })
        .where(eq(composers.id, composerId));
    }
    if (names.length > 0) {
      await tx
        .insert(composerSchools)
        .values(names.map((name) => ({ composerId, name })))
        .onConflictDoNothing();
    }
  });
  return names.length;
}
