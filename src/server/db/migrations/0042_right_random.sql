ALTER TABLE "paddle_subscriptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "paddle_webhook_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "paddle_subscriptions" CASCADE;--> statement-breakpoint
DROP TABLE "paddle_webhook_events" CASCADE;--> statement-breakpoint
DROP INDEX IF EXISTS "project_subscriptions_paddle_subscription_id_idx";--> statement-breakpoint
DELETE FROM "project_subscriptions" WHERE "polar_subscription_id" IS NULL;--> statement-breakpoint
ALTER TABLE "project_subscriptions" ALTER COLUMN "polar_subscription_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "paddle_subscription_id";