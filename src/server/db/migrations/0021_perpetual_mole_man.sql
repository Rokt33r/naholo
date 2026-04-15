CREATE TABLE "project_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"claimer_user_id" uuid,
	"inviter_project_worker_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_notification_emails_user_id" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_claimer_user_id_users_id_fk" FOREIGN KEY ("claimer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_inviter_project_worker_id_project_workers_id_fk" FOREIGN KEY ("inviter_project_worker_id") REFERENCES "public"."project_workers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_emails" ADD CONSTRAINT "user_notification_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "user_notification_emails" ("user_id", "email")
SELECT DISTINCT ON (u."id")
  u."id",
  COALESCE(
    email_otp."value",
    google."data"->>'email'
  )
FROM "users" u
LEFT JOIN "user_identifiers" email_otp
  ON email_otp."user_id" = u."id" AND email_otp."type" = 'email-otp'
LEFT JOIN "user_identifiers" google
  ON google."user_id" = u."id" AND google."type" = 'google'
WHERE COALESCE(email_otp."value", google."data"->>'email') IS NOT NULL;