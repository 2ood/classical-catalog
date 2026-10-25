import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const composers = pgTable("composers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  born: integer("born"),
  died: integer("died"),
  era: text("era"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const works = pgTable("works", {
  id: uuid("id").primaryKey().defaultRandom(),
  composerId: uuid("composer_id").references(() => composers.id, {
    onDelete: "cascade",
  }),
  catalogueNum: text("catalogue_num"),
  title: text("title").notNull(),
  genre: text("genre").notNull(),
  key: text("key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const recordings = pgTable("recordings", {
  id: uuid("id").primaryKey().defaultRandom(),
  workId: uuid("work_id").references(() => works.id, { onDelete: "cascade" }),
  performer: text("performer").notNull(),
  year: integer("year"),
  mediaType: text("media_type", { enum: ["youtube", "spotify"] }).notNull(),
  mediaUrl: text("media_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const scores = pgTable("scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  workId: uuid("work_id").references(() => works.id, { onDelete: "cascade" }),
  label: text("label"),
  fileName: text("file_name").notNull(), // file in SCORES_DIR
  source: text("source"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
});

export type Composer = typeof composers.$inferSelect;
export type Work = typeof works.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
