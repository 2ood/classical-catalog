import "server-only";
import { asc, count, countDistinct, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "./db";
import { composers, recordings, works } from "./schema";

/** All composers with the number of their works that have ≥1 recording. */
export function getComposersWithCounts() {
  return db
    .select({
      id: composers.id,
      name: composers.name,
      shortName: composers.shortName,
      slug: composers.slug,
      era: composers.era,
      recordedWorks: countDistinct(recordings.workId),
    })
    .from(composers)
    .leftJoin(works, eq(works.composerId, composers.id))
    .leftJoin(recordings, eq(recordings.workId, works.id))
    .groupBy(composers.id)
    .orderBy(asc(composers.name));
}

/**
 * A composer's works (unsorted), each flagged if it has ≥1 recording, with
 * the movements some recording has a start time or track for.
 */
export function getWorksForComposer(composerId: string) {
  return db
    .select({
      id: works.id,
      catalogueNum: works.catalogueNum,
      title: works.title,
      slug: works.slug,
      genre: works.genre,
      key: works.key,
      movements: works.movements,
      hasRecording: sql<boolean>`count(${recordings.id}) > 0`,
      recordedMovements: sql<string[]>`coalesce((
        select array_agg(distinct m) from ${recordings} r,
          jsonb_object_keys(r.movement_starts) m
        where r.work_id = ${works.id}), '{}')`,
    })
    .from(works)
    .leftJoin(recordings, eq(recordings.workId, works.id))
    .where(eq(works.composerId, composerId))
    .groupBy(works.id);
}

/** Composers imported from Open Opus, with their number of works. */
export function getImportedComposers() {
  return db
    .select({
      id: composers.id,
      slug: composers.slug,
      openOpusId: composers.openOpusId,
      works: count(works.id),
    })
    .from(composers)
    .leftJoin(works, eq(works.composerId, composers.id))
    .where(isNotNull(composers.openOpusId))
    .groupBy(composers.id);
}
