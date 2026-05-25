ALTER TABLE "operation_agent_sessions" ADD COLUMN "stats" jsonb;--> statement-breakpoint
ALTER TABLE "operation_agent_sessions" ADD COLUMN "stats_format" text;--> statement-breakpoint
ALTER TABLE "operation_agent_sessions" ADD COLUMN "stats_error" jsonb;