CREATE TABLE "polar_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"polar_subscription_id" text NOT NULL,
	"polar_customer_id" text NOT NULL,
	"billing_email" text DEFAULT '' NOT NULL,
	"metadata" jsonb,
	"status" text NOT NULL,
	"seat_quantity" integer DEFAULT 1 NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"trial_ends_at" timestamp,
	"cancel_at" timestamp,
	"canceled_at" timestamp,
	"last_event_occurred_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polar_webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"polar_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"polar_subscription_id" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_subscriptions" ADD COLUMN "polar_subscription_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "polar_subscriptions_polar_subscription_id_idx" ON "polar_subscriptions" USING btree ("polar_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "polar_webhook_events_polar_event_id_idx" ON "polar_webhook_events" USING btree ("polar_event_id");--> statement-breakpoint
CREATE INDEX "polar_webhook_events_polar_subscription_id_idx" ON "polar_webhook_events" USING btree ("polar_subscription_id");--> statement-breakpoint
ALTER TABLE "project_subscriptions" ADD CONSTRAINT "project_subscriptions_polar_subscription_id_polar_subscriptions_id_fk" FOREIGN KEY ("polar_subscription_id") REFERENCES "public"."polar_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_subscriptions_polar_subscription_id_idx" ON "project_subscriptions" USING btree ("polar_subscription_id");