// Gives composers without schools (movements) their built-in and Wikidata
// ones — for composers imported before schools existed. Run with
// `npm run db:schools`; composers that already have schools are skipped.
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { findArtist } from "../lib/musicbrainz";
import { seedSchools } from "../lib/school-store";
import * as schema from "../lib/schema";

loadEnvConfig(process.cwd());
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// Two MusicBrainz requests per composer; MusicBrainz allows one a second.
const PER_COMPOSER_MS = 2200;

async function main() {
  const all = await db.select().from(schema.composers);
  for (const composer of all) {
    const started = Date.now();
    const artistId = await findArtist(composer.name, composer.born).catch(
      () => null,
    );
    const added = await seedSchools(db, composer.id, composer.name, artistId);
    console.log(`${composer.name}: ${added ? `${added} added` : "unchanged"}`);
    await new Promise((r) =>
      setTimeout(r, Math.max(0, PER_COMPOSER_MS - (Date.now() - started))),
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
