ALTER TABLE "projects" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");