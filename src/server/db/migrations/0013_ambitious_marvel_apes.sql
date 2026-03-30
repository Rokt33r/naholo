CREATE TABLE "cli_login_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" text NOT NULL,
	"words" text NOT NULL,
	"code" text,
	"code_expires_at" timestamp,
	"user_id" uuid,
	"callback_url" text NOT NULL,
	"ip_address" text NOT NULL,
	"consumed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cli_login_requests_state_unique" UNIQUE("state")
);
--> statement-breakpoint
ALTER TABLE "cli_login_requests" ADD CONSTRAINT "cli_login_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;