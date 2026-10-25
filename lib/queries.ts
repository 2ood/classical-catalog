import "server-only";
import { asc, count, countDistinct, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  composerSchools,
  composers,
  performerAliases,
  performers,
  recordingPerformers,
  recordings,
  works,
} from "./schema";

/**
 * All composers with the number of their works that have ≥1 recording,
 * their years and their schools (movements).
 */
export function getComposersWithCounts() {
  return db
    .select({
      id: composers.id,
      name: composers.name,
      shortName: composers.shortName,
      slug: composers.slug,
      openOpusId: composers.openOpusId,
      era: composers.era,
      born: composers.born,
      died: composers.died,
      recordedWorks: countDistinct(recordings.workId),
      schools: sql<string[]>`coalesce((
        select array_agg(s.name order by s.name) from ${composerSchools} s
        where s.composer_id = ${composers.id}), '{}')`,
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

/** A composer's schools (movements), alphabetically. */
export async function getSchools(composerId: string): Promise<string[]> {
  const rows = await db
    .select({ name: composerSchools.name })
    .from(composerSchools)
    .where(eq(composerSchools.composerId, composerId))
    .orderBy(asc(composerSchools.name));
  return rows.map((r) => r.name);
}

/** All performers with their number of recordings, by name. */
export function getPerformers() {
  return db
    .select({
      id: performers.id,
      name: performers.name,
      slug: performers.slug,
      kind: performers.kind,
      instrument: performers.instrument,
      recordings: count(recordingPerformers.recordingId),
    })
    .from(performers)
    .leftJoin(
      recordingPerformers,
      eq(recordingPerformers.performerId, performers.id),
    )
    .groupBy(performers.id)
    .orderBy(asc(performers.name));
}

/**
 * A performer, the other names they go by, and their recordings with each
 * work and composer (by composer, then catalogue number).
 */
export async function getPerformer(slug: string) {
  const [performer] = await db
    .select()
    .from(performers)
    .where(eq(performers.slug, slug));
  if (!performer) return null;

  const [aliases, recs] = await Promise.all([
    db
      .select({ name: performerAliases.name })
      .from(performerAliases)
      .where(eq(performerAliases.performerId, performer.id)),
    db
      .select({
        id: recordings.id,
        performer: recordings.performer,
        year: recordings.year,
        mediaType: recordings.mediaType,
        work: {
          slug: works.slug,
          title: works.title,
          catalogueNum: works.catalogueNum,
          key: works.key,
        },
        composer: {
          slug: composers.slug,
          name: composers.name,
          born: composers.born,
        },
      })
      .from(recordingPerformers)
      .innerJoin(recordings, eq(recordings.id, recordingPerformers.recordingId))
      .innerJoin(works, eq(works.id, recordings.workId))
      .innerJoin(composers, eq(composers.id, works.composerId))
      .where(eq(recordingPerformers.performerId, performer.id)),
  ]);
  return {
    performer,
    aliases: aliases
      .map((a) => a.name)
      .filter((name) => name !== performer.name),
    recordings: recs,
  };
}

/** The performers of a work's recordings, in text order, by recording id. */
export async function getRecordingPerformers(workId: string) {
  const rows = await db
    .select({
      recordingId: recordingPerformers.recordingId,
      name: performers.name,
      slug: performers.slug,
    })
    .from(recordingPerformers)
    .innerJoin(performers, eq(performers.id, recordingPerformers.performerId))
    .innerJoin(recordings, eq(recordings.id, recordingPerformers.recordingId))
    .where(eq(recordings.workId, workId))
    .orderBy(asc(recordingPerformers.position));
  const byRecording: Record<string, { name: string; slug: string }[]> = {};
  for (const { recordingId, ...p } of rows) {
    (byRecording[recordingId] ??= []).push(p);
  }
  return byRecording;
}
