ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'inactive'::text;--> statement-breakpoint
DROP TYPE "public"."project_status";--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'inactive', 'seats-exceeded');--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'inactive'::"public"."project_status";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE "public"."project_status" USING "status"::"public"."project_status";