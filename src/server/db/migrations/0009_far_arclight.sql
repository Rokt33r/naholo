CREATE TABLE "project_worker_api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_worker_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_hint" text NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_worker_api_tokens" ADD CONSTRAINT "project_worker_api_tokens_project_worker_id_project_workers_id_fk" FOREIGN KEY ("project_worker_id") REFERENCES "public"."project_workers"("id") ON DELETE cascade ON UPDATE no action;