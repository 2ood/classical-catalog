import "server-only";
import {
  and,
  asc,
  count,
  countDistinct,
  eq,
  isNotNull,
  like,
  sql,
} from "drizzle-orm";
import { byVideo, isConcert, spanEnds } from "./concerts";
import { db } from "./db";
import {
  composerSchools,
  composers,
  likedTracks,
  performerAliases,
  performers,
  recordingPerformers,
  recordings,
  works,
} from "./schema";
import { searchWords } from "./works";

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

/** Liked movement ids per recording of the work ("" for a recording's piece). */
export async function getWorkLikes(
  workId: string,
): Promise<Record<string, string[]>> {
  const rows = await db
    .select({
      recordingId: likedTracks.recordingId,
      movementId: likedTracks.movementId,
    })
    .from(likedTracks)
    .innerJoin(recordings, eq(recordings.id, likedTracks.recordingId))
    .where(eq(recordings.workId, workId));
  const byRecording: Record<string, string[]> = {};
  for (const r of rows) (byRecording[r.recordingId] ??= []).push(r.movementId);
  return byRecording;
}

/**
 * Where each of a work's YouTube recordings ends in its video: its own end,
 * else where the video's next piece (of any work) starts.
 */
export async function getSpanEnds(
  workId: string,
): Promise<Record<string, number | null>> {
  const all = await db
    .select({
      id: recordings.id,
      workId: recordings.workId,
      mediaType: recordings.mediaType,
      mediaUrl: recordings.mediaUrl,
      startSeconds: recordings.startSeconds,
      endSeconds: recordings.endSeconds,
    })
    .from(recordings)
    .where(eq(recordings.mediaType, "youtube"));
  const ends: Record<string, number | null> = {};
  for (const spans of byVideo(all).values()) {
    if (!spans.some((s) => s.workId === workId)) continue;
    Object.assign(ends, spanEnds(spans));
  }
  return ends;
}

/** Every like with its recording, work and composer, for the Liked page. */
export function getLikes() {
  return db
    .select({
      movementId: likedTracks.movementId,
      recording: {
        id: recordings.id,
        performer: recordings.performer,
        slug: recordings.slug,
      },
      composer: {
        slug: composers.slug,
        name: composers.name,
        born: composers.born,
      },
      work: {
        slug: works.slug,
        title: works.title,
        catalogueNum: works.catalogueNum,
        movements: works.movements,
      },
    })
    .from(likedTracks)
    .innerJoin(recordings, eq(recordings.id, likedTracks.recordingId))
    .innerJoin(works, eq(works.id, recordings.workId))
    .innerJoin(composers, eq(composers.id, works.composerId));
}

/**
 * Works of any composer whose slugs hold every word of the search (see
 * searchWords), at most 20: for picking a concert piece's work.
 */
export function searchWorks(query: string) {
  const words = searchWords(query);
  const haystack = sql`replace(${composers.slug} || ${works.slug}, '-', '')`;
  return db
    .select({
      id: works.id,
      title: works.title,
      catalogueNum: works.catalogueNum,
      key: works.key,
      movements: works.movements,
      composer: composers.name,
    })
    .from(works)
    .innerJoin(composers, eq(composers.id, works.composerId))
    .where(and(...words.map((w) => sql`${haystack} like ${`%${w}%`}`)))
    .orderBy(asc(composers.born), asc(works.title))
    .limit(words.length ? 20 : 0);
}

// A YouTube recording as a piece of its video, with its work.
const concertPiece = {
  id: recordings.id,
  workId: recordings.workId,
  performer: recordings.performer,
  year: recordings.year,
  mediaType: recordings.mediaType,
  mediaUrl: recordings.mediaUrl,
  startSeconds: recordings.startSeconds,
  endSeconds: recordings.endSeconds,
  movementId: recordings.movementId,
  slug: recordings.slug,
  movementStarts: recordings.movementStarts,
  createdAt: recordings.createdAt,
  work: {
    title: works.title,
    catalogueNum: works.catalogueNum,
    slug: works.slug,
    movements: works.movements,
  },
  composer: { name: composers.name, slug: composers.slug },
};

function concertPieces(videoId?: string) {
  return db
    .select(concertPiece)
    .from(recordings)
    .innerJoin(works, eq(works.id, recordings.workId))
    .innerJoin(composers, eq(composers.id, works.composerId))
    .where(
      and(
        eq(recordings.mediaType, "youtube"),
        videoId ? like(recordings.mediaUrl, `%${videoId}%`) : undefined,
      ),
    );
}

export type ConcertPiece = Awaited<ReturnType<typeof concertPieces>>[number];

/** The pieces of one video. */
export async function getConcert(videoId: string): Promise<ConcertPiece[]> {
  return byVideo(await concertPieces(videoId)).get(videoId) ?? [];
}

/** Every video that is a concert (see isConcert), the latest mapped first. */
export async function getConcerts() {
  const latest = (pieces: ConcertPiece[]) =>
    Math.max(...pieces.map((p) => p.createdAt?.getTime() ?? 0));
  return [...byVideo(await concertPieces())]
    .filter(([, pieces]) => isConcert(pieces))
    .map(([videoId, pieces]) => ({ videoId, pieces }))
    .sort((a, b) => latest(b.pieces) - latest(a.pieces));
}
