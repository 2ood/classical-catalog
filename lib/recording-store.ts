import { and, eq, ne } from "drizzle-orm";
import { db } from "./db";
import { recordingSlug } from "./recordings";
import { recordings } from "./schema";
import { uniqueSlug } from "./slugs";

/** A slug for a recording of the work, not taken by its other recordings. */
export async function freeRecordingSlug(
  workId: string,
  performer: string,
  year: number | null,
  except?: string,
) {
  const taken = await db
    .select({ slug: recordings.slug })
    .from(recordings)
    .where(
      and(
        eq(recordings.workId, workId),
        except ? ne(recordings.id, except) : undefined,
      ),
    );
  return uniqueSlug(
    recordingSlug(performer, year),
    new Set(taken.map((r) => r.slug)),
  );
}
