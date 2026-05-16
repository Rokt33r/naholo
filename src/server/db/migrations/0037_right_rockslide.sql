ALTER TABLE "polar_webhook_events" RENAME COLUMN "polar_event_id" TO "polar_event_data_id";--> statement-breakpoint
DROP INDEX "polar_webhook_events_polar_event_id_idx";--> statement-breakpoint
DROP INDEX "polar_webhook_events_polar_subscription_id_idx";--> statement-breakpoint
ALTER TABLE "polar_webhook_events" ADD COLUMN "polar_webhook_id" text;--> statement-breakpoint
CREATE INDEX "polar_webhook_events_polar_event_data_id_idx" ON "polar_webhook_events" USING btree ("polar_event_data_id");--> statement-breakpoint
CREATE INDEX "polar_webhook_events_polar_webhook_id_idx" ON "polar_webhook_events" USING btree ("polar_webhook_id");--> statement-breakpoint
ALTER TABLE "polar_webhook_events" DROP COLUMN "polar_subscription_id";