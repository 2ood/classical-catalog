-- Slugs for existing rows, close to lib/slugs.ts; new rows get theirs from the app.
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE FUNCTION pg_temp.slugify(t text) RETURNS text AS $$
  SELECT CASE WHEN length(s) <= 80 THEN s
    ELSE regexp_replace(left(s, 81), '-[^-]*$', '') END
  FROM (SELECT trim(both '-' from regexp_replace(
    lower(unaccent(replace(t, 'ß', 'ss'))), '[^a-z0-9]+', '-', 'g')) AS s) x
$$ LANGUAGE sql;--> statement-breakpoint
ALTER TABLE "composers" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "slug" text;--> statement-breakpoint
-- Composers by short name; a second composer with the same one gets the full name.
UPDATE "composers" c SET "slug" = CASE WHEN r.n = 1 THEN r.base ELSE pg_temp.slugify(c."name") END
FROM (
  SELECT "id", pg_temp.slugify("short_name") AS base,
    row_number() OVER (PARTITION BY pg_temp.slugify("short_name") ORDER BY "created_at", "id") AS n
  FROM "composers"
) r
WHERE c."id" = r."id";--> statement-breakpoint
-- Works by title and catalogue number; repeats within a composer get -2, -3, …
UPDATE "works" w SET "slug" = CASE WHEN r.n = 1 THEN r.base ELSE r.base || '-' || r.n END
FROM (
  SELECT "id", pg_temp.slugify("title" || ' ' || coalesce("catalogue_num", '')) AS base,
    row_number() OVER (
      PARTITION BY "composer_id", pg_temp.slugify("title" || ' ' || coalesce("catalogue_num", ''))
      ORDER BY "created_at", "id"
    ) AS n
  FROM "works"
) r
WHERE w."id" = r."id";--> statement-breakpoint
ALTER TABLE "composers" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "works" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "composers" ADD CONSTRAINT "composers_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_composer_id_slug_unique" UNIQUE("composer_id","slug");
