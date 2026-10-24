import "server-only";
import { asc, countDistinct, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { composers, recordings, works } from "./schema";

/** All composers with the number of their works that have ≥1 recording. */
export function getComposersWithCounts() {
  return db
    .select({
      id: composers.id,
      name: composers.name,
      shortName: composers.shortName,
      era: composers.era,
      recordedWorks: countDistinct(recordings.workId),
    })
    .from(composers)
    .leftJoin(works, eq(works.composerId, composers.id))
    .leftJoin(recordings, eq(recordings.workId, works.id))
    .groupBy(composers.id)
    .orderBy(asc(composers.name));
}

/** A composer's works, each flagged if it has ≥1 recording (unsorted). */
export function getWorksForComposer(composerId: string) {
  return db
    .select({
      id: works.id,
      catalogueNum: works.catalogueNum,
      title: works.title,
      genre: works.genre,
      key: works.key,
      hasRecording: sql<boolean>`count(${recordings.id}) > 0`,
    })
    .from(works)
    .leftJoin(recordings, eq(recordings.workId, works.id))
    .where(eq(works.composerId, composerId))
    .groupBy(works.id);
}
