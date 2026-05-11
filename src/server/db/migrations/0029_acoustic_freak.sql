CREATE TABLE "operation_agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"title" text,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL,
	"transcript" text,
	"transcript_truncated" boolean DEFAULT false NOT NULL,
	"transcript_size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "operation_agent_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "operation_agent_sessions" ADD CONSTRAINT "operation_agent_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_agent_sessions" ADD CONSTRAINT "operation_agent_sessions_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;