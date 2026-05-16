ALTER TABLE "polar_subscriptions" RENAME COLUMN "seat_quantity" TO "seats";--> statement-breakpoint
ALTER TABLE "polar_subscriptions" RENAME COLUMN "trial_ends_at" TO "trial_end";--> statement-breakpoint
ALTER TABLE "polar_subscriptions" RENAME COLUMN "cancel_at" TO "cancel_at_period_end";--> statement-breakpoint
ALTER TABLE "polar_webhook_events" RENAME COLUMN "polar_event_data_id" TO "event_data_id";--> statement-breakpoint
ALTER TABLE "polar_webhook_events" RENAME COLUMN "polar_webhook_id" TO "webhook_event_id";--> statement-breakpoint
ALTER TABLE "polar_webhook_events" RENAME COLUMN "occurred_at" TO "event_timestamp";--> statement-breakpoint
DROP INDEX "polar_webhook_events_polar_event_data_id_idx";--> statement-breakpoint
DROP INDEX "polar_webhook_events_polar_webhook_id_idx";--> statement-breakpoint
ALTER TABLE "polar_subscriptions" ADD COLUMN "trial_start" timestamp;--> statement-breakpoint
ALTER TABLE "polar_subscriptions" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "polar_subscriptions" ADD COLUMN "ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "polar_subscriptions" ADD COLUMN "ended_at" timestamp;--> statement-breakpoint
ALTER TABLE "polar_subscriptions" ADD COLUMN "modified_at" timestamp;--> statement-breakpoint
CREATE INDEX "polar_webhook_events_event_data_id_idx" ON "polar_webhook_events" USING btree ("event_data_id");--> statement-breakpoint
CREATE INDEX "polar_webhook_events_webhook_event_id_idx" ON "polar_webhook_events" USING btree ("webhook_event_id");--> statement-breakpoint
ALTER TABLE "polar_subscriptions" DROP COLUMN "last_event_occurred_at";