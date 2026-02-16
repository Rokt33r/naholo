ALTER TABLE "tasks" RENAME COLUMN "content" TO "name";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "note" text;