ALTER TABLE "composers" ADD COLUMN "open_opus_id" integer;--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "open_opus_id" integer;--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "popular" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "works" ADD COLUMN "recommended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "composers" ADD CONSTRAINT "composers_open_opus_id_unique" UNIQUE("open_opus_id");--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_open_opus_id_unique" UNIQUE("open_opus_id");