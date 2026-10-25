// Moves score PDFs stored under generated names (<uuid>.pdf) to
// "<composer>/<work>/<label>.pdf" under SCORES_DIR. Run with
// `npm run db:scores`; scores already filed by slug are skipped.
import fs from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/schema";
import { scoreFileName } from "../lib/scores";
import { scoreFilePath } from "../lib/storage";

loadEnvConfig(process.cwd());
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });
const { scores, works, composers } = schema;
const GENERATED = /^[0-9a-f-]{36}\.pdf$/;

async function main() {
  const rows = await db
    .select({
      id: scores.id,
      fileName: scores.fileName,
      label: scores.label,
      work: works.slug,
      composer: composers.slug,
    })
    .from(scores)
    .innerJoin(works, eq(works.id, scores.workId))
    .innerJoin(composers, eq(composers.id, works.composerId));
  const taken = new Set(rows.map((r) => r.fileName));

  let moved = 0;
  for (const r of rows.filter((r) => GENERATED.test(r.fileName))) {
    const name = scoreFileName(r.composer, r.work, r.label ?? "", taken);
    taken.add(name);
    const from = scoreFilePath(r.fileName);
    const to = scoreFilePath(name);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.rename(from, to);
    try {
      await db
        .update(scores)
        .set({ fileName: name })
        .where(eq(scores.id, r.id));
    } catch (error) {
      await fs.rename(to, from); // keep file and record in step
      throw error;
    }
    console.log(`${r.fileName} → ${name}`);
    moved++;
  }
  console.log(`Moved ${moved} scores.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
