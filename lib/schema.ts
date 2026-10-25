import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { MovementMarks, WorkMovement } from "./movements";

export const composers = pgTable("composers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  slug: text("slug").notNull().unique(), // in URLs, see lib/slugs.ts
  born: integer("born"),
  died: integer("died"),
  era: text("era"),
  openOpusId: integer("open_opus_id").unique(),
  wikidataId: text("wikidata_id"), // e.g. "Q4700"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// A composer's schools / movements (Impressionism, The Five, …).
export const composerSchools = pgTable(
  "composer_schools",
  {
    composerId: uuid("composer_id")
      .notNull()
      .references(() => composers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (t) => [primaryKey({ columns: [t.composerId, t.name] })],
);

export const works = pgTable(
  "works",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    composerId: uuid("composer_id").references(() => composers.id, {
      onDelete: "cascade",
    }),
    catalogueNum: text("catalogue_num"),
    title: text("title").notNull(),
    slug: text("slug").notNull(), // unique per composer
    genre: text("genre").notNull(),
    key: text("key"),
    openOpusId: integer("open_opus_id").unique(),
    // Open Opus picks, a starting point for collecting.
    popular: boolean("popular").notNull().default(false),
    recommended: boolean("recommended").notNull().default(false),
    movements: jsonb("movements").$type<WorkMovement[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique().on(t.composerId, t.slug)],
);

export const recordings = pgTable("recordings", {
  id: uuid("id").primaryKey().defaultRandom(),
  workId: uuid("work_id").references(() => works.id, { onDelete: "cascade" }),
  performer: text("performer").notNull(),
  year: integer("year"),
  mediaType: text("media_type", { enum: ["youtube", "spotify"] }).notNull(),
  mediaUrl: text("media_url").notNull(),
  // Per movement id: start in seconds (YouTube) or a track URL (Spotify).
  movementStarts: jsonb("movement_starts")
    .$type<MovementMarks<number | string>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const scores = pgTable("scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  workId: uuid("work_id").references(() => works.id, { onDelete: "cascade" }),
  label: text("label"),
  fileName: text("file_name").notNull(), // file in SCORES_DIR
  source: text("source"),
  // Start page per movement id of the work.
  movementPages: jsonb("movement_pages")
    .$type<MovementMarks<number>>()
    .notNull()
    .default({}),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
});

export type Composer = typeof composers.$inferSelect;
export type Work = typeof works.$inferSelect;
export type Recording = typeof recordings.$inferSelect;

// The owner's Spotify login (one row, id 1); see lib/spotify-server.ts.
export const spotifyTokens = pgTable("spotify_tokens", {
  id: integer("id").primaryKey().default(1),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// Performers behind recordings' performer texts; see lib/performers.ts.
export const performers = pgTable("performers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // in URLs
  kind: text("kind", { enum: ["person", "orchestra", "choir", "ensemble"] })
    .notNull()
    .default("person"),
  instrument: text("instrument"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Other names for a performer ("BPO"); `key` is the compared form, unique so
// a name can't mean two performers.
export const performerAliases = pgTable("performer_aliases", {
  key: text("key").primaryKey(),
  performerId: uuid("performer_id")
    .notNull()
    .references(() => performers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const recordingPerformers = pgTable(
  "recording_performers",
  {
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),
    performerId: uuid("performer_id")
      .notNull()
      .references(() => performers.id, { onDelete: "cascade" }),
    // Order in the performer text.
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.recordingId, t.performerId] })],
);

export type Performer = typeof performers.$inferSelect;
