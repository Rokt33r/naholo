CREATE TABLE "skill_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skills" DROP CONSTRAINT "skills_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "skill_set_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "skill_sets" ADD CONSTRAINT "skill_sets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "skill_sets_project_id_slug_unique" ON "skill_sets" USING btree ("project_id","slug");--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_skill_set_id_skill_sets_id_fk" FOREIGN KEY ("skill_set_id") REFERENCES "public"."skill_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "skills_skill_set_id_name_unique" ON "skills" USING btree ("skill_set_id","name");--> statement-breakpoint
ALTER TABLE "skills" DROP COLUMN "project_id";