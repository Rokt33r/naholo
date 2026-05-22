ALTER TYPE "public"."project_status" ADD VALUE 'trial' BEFORE 'inactive';--> statement-breakpoint
CREATE TABLE "project_trials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "trial_until" timestamp;--> statement-breakpoint
ALTER TABLE "project_trials" ADD CONSTRAINT "project_trials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_trials" ADD CONSTRAINT "project_trials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_trials_user_id_idx" ON "project_trials" USING btree ("user_id");