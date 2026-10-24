import "server-only";
import { asc, countDistinct, eq } from "drizzle-orm";
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
