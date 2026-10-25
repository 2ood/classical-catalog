import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { db } from "./db";
import {
  mergeMovements,
  type MovementMarks,
  type MovementRow,
} from "./movements";
import { works } from "./schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Writes editor rows to the work's movement list (names, order, ids) and
 * returns the marks keyed by the resulting movement ids.
 */
export async function saveWorkMovements<M>(
  tx: Tx,
  workId: string,
  rows: MovementRow<M>[],
): Promise<MovementMarks<M>> {
  const [work] = await tx
    .select({ movements: works.movements })
    .from(works)
    .where(eq(works.id, workId));
  const { movements, marks } = mergeMovements(
    work?.movements ?? [],
    rows,
    randomUUID,
  );
  await tx.update(works).set({ movements }).where(eq(works.id, workId));
  return marks;
}
