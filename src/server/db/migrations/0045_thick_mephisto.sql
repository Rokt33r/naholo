DELETE FROM "project_operators" WHERE "type" = 'bot';--> statement-breakpoint
DROP TABLE "project_operator_api_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "project_operators" DROP COLUMN "type";