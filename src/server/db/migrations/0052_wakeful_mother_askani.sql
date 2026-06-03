ALTER TABLE "operation_agent_sessions" RENAME TO "operation_agent_transcripts";--> statement-breakpoint
ALTER TABLE "operation_agent_transcripts" RENAME COLUMN "session_id" TO "transcript_id";--> statement-breakpoint
ALTER TABLE "operation_agent_transcripts" DROP CONSTRAINT "operation_agent_sessions_operation_id_session_id";--> statement-breakpoint
ALTER TABLE "operation_agent_transcripts" DROP CONSTRAINT "operation_agent_sessions_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_agent_transcripts" DROP CONSTRAINT "operation_agent_sessions_operation_id_operations_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_agent_transcripts" DROP CONSTRAINT "operation_agent_sessions_project_operator_id_project_operators_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_agent_transcripts" ADD CONSTRAINT "operation_agent_transcripts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_agent_transcripts" ADD CONSTRAINT "operation_agent_transcripts_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_agent_transcripts" ADD CONSTRAINT "operation_agent_transcripts_project_operator_id_project_operators_id_fk" FOREIGN KEY ("project_operator_id") REFERENCES "public"."project_operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_agent_transcripts" ADD CONSTRAINT "operation_agent_transcripts_operation_id_transcript_id" UNIQUE("operation_id","transcript_id");