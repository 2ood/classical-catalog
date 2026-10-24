import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/neon-http";
import { composers, recordings, works } from "../lib/schema";

loadEnvConfig(process.cwd());
const db = drizzle(process.env.DATABASE_URL!);

const data = [
  {
    composer: {
      name: "Johann Sebastian Bach",
      shortName: "Bach",
      born: 1685,
      died: 1750,
      era: "Baroque",
    },
    works: [
      {
        catalogueNum: "BWV 988",
        title: "Goldberg Variations",
        genre: "Keyboard",
        key: "G major",
        recordings: [
          {
            performer: "Glenn Gould",
            year: 1981,
            mediaType: "youtube" as const,
            mediaUrl: "https://www.youtube.com/watch?v=p4yAB37wG5s",
          },
        ],
      },
      {
        catalogueNum: "BWV 1007",
        title: "Cello Suite No. 1",
        genre: "Chamber",
        key: "G major",
        recordings: [],
      },
    ],
  },
  {
    composer: {
      name: "Wolfgang Amadeus Mozart",
      shortName: "Mozart",
      born: 1756,
      died: 1791,
      era: "Classical",
    },
    works: [
      {
        catalogueNum: "K. 550",
        title: "Symphony No. 40",
        genre: "Symphony",
        key: "G minor",
        recordings: [
          {
            performer: "Fischer / Danish National Chamber Orchestra",
            year: null,
            mediaType: "youtube" as const,
            mediaUrl: "https://www.youtube.com/watch?v=-Iz-ah9ka3c",
          },
          {
            performer: "Böhm / BPO",
            year: null,
            mediaType: "youtube" as const,
            mediaUrl: "https://www.youtube.com/watch?v=KTl_GnlLH4U",
          },
        ],
      },
      {
        catalogueNum: "K. 525",
        title: "Eine kleine Nachtmusik",
        genre: "Serenade",
        key: "G major",
        recordings: [],
      },
    ],
  },
  {
    composer: {
      name: "Ludwig van Beethoven",
      shortName: "Beethoven",
      born: 1770,
      died: 1827,
      era: "Classical",
    },
    works: [
      {
        catalogueNum: "Op. 67",
        title: "Symphony No. 5",
        genre: "Symphony",
        key: "C minor",
        recordings: [
          {
            performer: "Karajan / BPO",
            year: null,
            mediaType: "spotify" as const,
            mediaUrl: "https://open.spotify.com/track/0eBr9W1GE5nou99gRdy02J",
          },
          {
            performer: "Karajan / BPO (cycle)",
            year: null,
            mediaType: "spotify" as const,
            mediaUrl: "https://open.spotify.com/album/6Pqlj0jyStFJgTidjdLGHC",
          },
        ],
      },
      {
        catalogueNum: "Op. 27 No. 2",
        title: "Piano Sonata No. 14 “Moonlight”",
        genre: "Piano Sonata",
        key: "C-sharp minor",
        recordings: [],
      },
    ],
  },
];

async function main() {
  const existing = await db
    .select({ id: composers.id })
    .from(composers)
    .limit(1);
  if (existing.length > 0) {
    console.log("Database already has composers — skipping seed.");
    return;
  }

  for (const entry of data) {
    const [composer] = await db
      .insert(composers)
      .values(entry.composer)
      .returning({ id: composers.id });
    for (const { recordings: recs, ...work } of entry.works) {
      const [inserted] = await db
        .insert(works)
        .values({ ...work, composerId: composer.id })
        .returning({ id: works.id });
      if (recs.length > 0) {
        await db
          .insert(recordings)
          .values(recs.map((r) => ({ ...r, workId: inserted.id })));
      }
    }
  }
  console.log(`Seeded ${data.length} composers.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
