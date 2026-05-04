CREATE TABLE "paddle_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paddle_subscription_id" text NOT NULL,
	"paddle_customer_id" text NOT NULL,
	"billing_email" text DEFAULT '' NOT NULL,
	"custom_data" jsonb,
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
CREATE TABLE "paddle_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"paddle_transaction_id" text,
	"paddle_subscription_id" text,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP CONSTRAINT "project_subscriptions_billing_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "project_subscriptions_project_id_idx";--> statement-breakpoint
DROP INDEX "project_subscriptions_paddle_subscription_id_idx";--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "paddle_subscription_id";--> statement-breakpoint
ALTER TABLE "project_subscriptions" ADD COLUMN "paddle_subscription_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "active_project_subscription_id" uuid;--> statement-breakpoint
ALTER TABLE "project_subscriptions" ADD COLUMN "created_by_operator_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "paddle_subscriptions_paddle_subscription_id_idx" ON "paddle_subscriptions" USING btree ("paddle_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "paddle_webhook_events_event_id_idx" ON "paddle_webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "paddle_webhook_events_paddle_transaction_id_idx" ON "paddle_webhook_events" USING btree ("paddle_transaction_id");--> statement-breakpoint
CREATE INDEX "paddle_webhook_events_paddle_subscription_id_idx" ON "paddle_webhook_events" USING btree ("paddle_subscription_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_active_project_subscription_id_project_subscriptions_id_fk" FOREIGN KEY ("active_project_subscription_id") REFERENCES "public"."project_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_subscriptions" ADD CONSTRAINT "project_subscriptions_paddle_subscription_id_paddle_subscriptions_id_fk" FOREIGN KEY ("paddle_subscription_id") REFERENCES "public"."paddle_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_subscriptions" ADD CONSTRAINT "project_subscriptions_created_by_operator_id_project_operators_id_fk" FOREIGN KEY ("created_by_operator_id") REFERENCES "public"."project_operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_subscriptions_paddle_subscription_id_idx" ON "project_subscriptions" USING btree ("paddle_subscription_id");--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "billing_user_id";--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "paddle_customer_id";--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "seat_quantity";--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "current_period_start";--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "current_period_end";--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "trial_ends_at";--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "cancel_at";--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "canceled_at";