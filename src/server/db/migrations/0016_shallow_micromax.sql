ALTER TABLE "issues" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_id_number_idx" ON "issues" USING btree ("project_id","number");