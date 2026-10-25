import { eq, sql } from "drizzle-orm";
import type { db } from "./db";
import {
  guessKind,
  performerKey,
  resolvePerformers,
  splitPerformers,
  type PerformerKind,
} from "./performers";
import {
  performerAliases,
  performers,
  recordingPerformers,
  recordings,
} from "./schema";
import { slugify, uniqueSlug } from "./slugs";

type Database = typeof db;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Every performer with all its names (a performer's own name is an alias too). */
async function knownPerformers(tx: Tx) {
  const rows = await tx
    .select({ id: performerAliases.performerId, name: performerAliases.name })
    .from(performerAliases);
  const byId = new Map<string, string[]>();
  for (const r of rows) byId.set(r.id, [...(byId.get(r.id) ?? []), r.name]);
  return [...byId].map(([id, [name, ...aliases]]) => ({ id, name, aliases }));
}

/**
 * Links a recording to the performers its text names, creating the ones
 * not known yet (kind guessed from the name). Replaces earlier links.
 */
export function linkPerformers(
  database: Database,
  recordingId: string,
  text: string,
) {
  return database.transaction(async (tx) => {
    const parts = splitPerformers(text);
    const { ids, created } = resolvePerformers(
      parts,
      await knownPerformers(tx),
    );

    const slugs = new Set(
      (await tx.select({ slug: performers.slug }).from(performers)).map(
        (p) => p.slug,
      ),
    );
    const newIds: string[] = [];
    for (const name of created) {
      const slug = uniqueSlug(slugify(name) || "performer", slugs);
      slugs.add(slug);
      const [row] = await tx
        .insert(performers)
        .values({ name, slug, kind: guessKind(name) })
        .returning({ id: performers.id });
      await tx
        .insert(performerAliases)
        .values({ key: performerKey(name), performerId: row.id, name });
      newIds.push(row.id);
    }
    // Created performers fill the gaps, in order.
    const ordered = ids.map((id) => id ?? newIds.shift()!);

    await tx
      .delete(recordingPerformers)
      .where(eq(recordingPerformers.recordingId, recordingId));
    if (ordered.length > 0) {
      await tx.insert(recordingPerformers).values(
        ordered.map((performerId, position) => ({
          recordingId,
          performerId,
          position,
        })),
      );
    }
  });
}

/**
 * Renames a performer; the old name stays an alias, so texts that use it
 * still find them. Fails when the new name already means someone else.
 */
export function renamePerformer(database: Database, id: string, name: string) {
  return database.transaction(async (tx) => {
    const key = performerKey(name);
    const [owner] = await tx
      .select({ performerId: performerAliases.performerId })
      .from(performerAliases)
      .where(eq(performerAliases.key, key));
    if (owner && owner.performerId !== id) {
      return { ok: false as const, error: "Another performer has that name" };
    }
    if (!owner) {
      await tx.insert(performerAliases).values({ key, performerId: id, name });
    }
    await tx.update(performers).set({ name }).where(eq(performers.id, id));
    return { ok: true as const };
  });
}

/**
 * Merges `fromId` into `intoId`: its names become aliases of `intoId`, its
 * recordings move over, and it is removed.
 */
export function mergePerformers(
  database: Database,
  fromId: string,
  intoId: string,
) {
  return database.transaction(async (tx) => {
    await tx
      .update(performerAliases)
      .set({ performerId: intoId })
      .where(eq(performerAliases.performerId, fromId));
    // Recordings naming both keep one link.
    await tx.execute(sql`
      insert into ${recordingPerformers} (recording_id, performer_id, position)
      select recording_id, ${intoId}, position from ${recordingPerformers}
      where performer_id = ${fromId}
      on conflict do nothing`);
    await tx.delete(performers).where(eq(performers.id, fromId));
  });
}

export function updatePerformer(
  database: Database,
  id: string,
  changes: { kind?: PerformerKind; instrument?: string | null },
) {
  return database.update(performers).set(changes).where(eq(performers.id, id));
}

/** Recordings not linked to any performer yet (e.g. from before performers). */
export function unlinkedRecordings(database: Database) {
  const linked = database
    .select({ id: recordingPerformers.recordingId })
    .from(recordingPerformers);
  return database
    .select({ id: recordings.id, performer: recordings.performer })
    .from(recordings)
    .where(sql`${recordings.id} not in (${linked})`);
}
