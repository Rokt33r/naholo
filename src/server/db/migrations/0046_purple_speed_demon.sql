CREATE TYPE "public"."project_status" AS ENUM('active', 'inactive', 'seat-exhausted');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" "project_status" DEFAULT 'inactive' NOT NULL;