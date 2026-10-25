CREATE TABLE "liked_movements" (
	"work_id" uuid NOT NULL,
	"movement_id" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "liked_movements_work_id_movement_id_pk" PRIMARY KEY("work_id","movement_id")
);
--> statement-breakpoint
ALTER TABLE "liked_movements" ADD CONSTRAINT "liked_movements_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;