ALTER TABLE "recordings" ADD COLUMN "slug" text;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
-- Performer and year, as recordingSlug makes them; -2, -3, … within a work.
WITH base AS (
  SELECT id, work_id, created_at, coalesce(nullif(trim(both '-' FROM regexp_replace(
    lower(unaccent(replace(
      regexp_replace(performer, '\([^)]*\)', ' ', 'g') || ' ' || coalesce(year::text, ''),
      'ß', 'ss'))),
    '[^a-z0-9]+', '-', 'g')), ''), 'recording') AS slug
  FROM recordings
), numbered AS (
  SELECT id, slug, row_number() OVER (PARTITION BY work_id, slug ORDER BY created_at, id) AS n
  FROM base
)
UPDATE recordings r
SET slug = numbered.slug || CASE WHEN n > 1 THEN '-' || n ELSE '' END
FROM numbered WHERE r.id = numbered.id;--> statement-breakpoint
ALTER TABLE "recordings" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_work_id_slug_unique" UNIQUE("work_id","slug");
