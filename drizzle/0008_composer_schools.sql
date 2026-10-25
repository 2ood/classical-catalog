CREATE TABLE "composer_schools" (
	"composer_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "composer_schools_composer_id_name_pk" PRIMARY KEY("composer_id","name")
);
--> statement-breakpoint
ALTER TABLE "composers" ADD COLUMN "wikidata_id" text;--> statement-breakpoint
ALTER TABLE "composer_schools" ADD CONSTRAINT "composer_schools_composer_id_composers_id_fk" FOREIGN KEY ("composer_id") REFERENCES "public"."composers"("id") ON DELETE cascade ON UPDATE no action;