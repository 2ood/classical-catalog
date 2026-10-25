CREATE TABLE "composers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"born" integer,
	"died" integer,
	"era" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" uuid,
	"performer" text NOT NULL,
	"year" integer,
	"media_type" text NOT NULL,
	"media_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" uuid,
	"label" text,
	"file_name" text NOT NULL,
	"source" text,
	"uploaded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"composer_id" uuid,
	"catalogue_num" text,
	"title" text NOT NULL,
	"genre" text NOT NULL,
	"key" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_composer_id_composers_id_fk" FOREIGN KEY ("composer_id") REFERENCES "public"."composers"("id") ON DELETE cascade ON UPDATE no action;