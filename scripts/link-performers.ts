// Links recordings made before performers existed to the performers their
// texts name (creating them). Run with `npm run db:performers`; recordings
// already linked are skipped.
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { linkPerformers, unlinkedRecordings } from "../lib/performer-store";
import * as schema from "../lib/schema";

loadEnvConfig(process.cwd());
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function main() {
  const recordings = await unlinkedRecordings(db);
  for (const r of recordings) {
    await linkPerformers(db, r.id, r.performer);
    console.log(r.performer);
  }
  console.log(`Linked ${recordings.length} recordings.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
