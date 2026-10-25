CREATE TABLE "liked_tracks" (
	"recording_id" uuid NOT NULL,
	"movement_id" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "liked_tracks_recording_id_movement_id_pk" PRIMARY KEY("recording_id","movement_id")
);
--> statement-breakpoint
ALTER TABLE "liked_tracks" ADD CONSTRAINT "liked_tracks_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Likes were per work movement; each moves to its work's earliest recording.
INSERT INTO "liked_tracks" ("recording_id", "movement_id", "created_at")
SELECT DISTINCT ON (l."work_id", l."movement_id") r."id", l."movement_id", l."created_at"
FROM "liked_movements" l
JOIN "recordings" r ON r."work_id" = l."work_id"
ORDER BY l."work_id", l."movement_id", r."created_at", r."id";
