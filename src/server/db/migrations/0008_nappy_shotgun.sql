ALTER TABLE "issues" DROP CONSTRAINT "issues_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "logs" DROP CONSTRAINT "logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "notes_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "logs" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "user_id";