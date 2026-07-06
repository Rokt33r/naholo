ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'free'::text;--> statement-breakpoint
UPDATE "projects" SET "status" = CASE
  WHEN (SELECT count(*) FROM "project_operators" po WHERE po."project_id" = "projects"."id") > 1 THEN 'suspended'
  ELSE 'free'
END
WHERE "status" IN ('trial', 'inactive');--> statement-breakpoint
DROP TYPE "public"."project_status";--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('free', 'active', 'suspended', 'seats-exceeded');--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'free'::"public"."project_status";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE "public"."project_status" USING "status"::"public"."project_status";