CREATE TABLE "project_workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid,
	"type" text DEFAULT 'user' NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_workers" ADD CONSTRAINT "project_workers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_workers" ADD CONSTRAINT "project_workers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "project_workers" ("id", "project_id", "user_id", "type", "name", "role", "created_at")
SELECT gen_random_uuid(), p."id", p."user_id", 'user', u."name", 'admin', p."created_at"
FROM "projects" p
JOIN "users" u ON u."id" = p."user_id";
