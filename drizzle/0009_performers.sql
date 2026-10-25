CREATE TABLE "performer_aliases" (
	"key" text PRIMARY KEY NOT NULL,
	"performer_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text DEFAULT 'person' NOT NULL,
	"instrument" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "performers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "recording_performers" (
	"recording_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "recording_performers_recording_id_performer_id_pk" PRIMARY KEY("recording_id","performer_id")
);
--> statement-breakpoint
ALTER TABLE "performer_aliases" ADD CONSTRAINT "performer_aliases_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_performers" ADD CONSTRAINT "recording_performers_recording_id_recordings_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."recordings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_performers" ADD CONSTRAINT "recording_performers_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;