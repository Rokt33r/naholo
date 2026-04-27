CREATE TABLE "project_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"billing_user_id" uuid NOT NULL,
	"paddle_customer_id" text,
	"paddle_subscription_id" text,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"seat_quantity" integer DEFAULT 1 NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"trial_ends_at" timestamp,
	"cancel_at" timestamp,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_subscriptions" ADD CONSTRAINT "project_subscriptions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_subscriptions" ADD CONSTRAINT "project_subscriptions_billing_user_id_users_id_fk" FOREIGN KEY ("billing_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_subscriptions_project_id_idx" ON "project_subscriptions" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_subscriptions_paddle_subscription_id_idx" ON "project_subscriptions" USING btree ("paddle_subscription_id") WHERE "project_subscriptions"."paddle_subscription_id" is not null;