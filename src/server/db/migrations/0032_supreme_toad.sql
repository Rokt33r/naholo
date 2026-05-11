ALTER TABLE "operation_agent_sessions" ADD COLUMN "has_transcript" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "operation_agent_sessions" DROP COLUMN "transcript";--> statement-breakpoint
ALTER TABLE "operation_agent_sessions" DROP COLUMN "transcript_truncated";