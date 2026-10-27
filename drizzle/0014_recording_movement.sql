ALTER TABLE "recordings" ADD COLUMN "movement_id" text;--> statement-breakpoint
-- Excerpts, so far told apart by their marks: a span of a video marking just
-- one movement of a work with several.
UPDATE recordings r SET movement_id = (SELECT k FROM jsonb_object_keys(r.movement_starts) k)
FROM works w
WHERE w.id = r.work_id
  AND (r.start_seconds IS NOT NULL OR r.end_seconds IS NOT NULL)
  AND jsonb_array_length(w.movements) > 1
  AND (SELECT count(*) FROM jsonb_object_keys(r.movement_starts)) = 1;
