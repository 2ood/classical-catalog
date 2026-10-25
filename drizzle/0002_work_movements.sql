ALTER TABLE "recordings" ADD COLUMN "movement_starts" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "movement_pages" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "movements" jsonb DEFAULT '[]'::jsonb NOT NULL;