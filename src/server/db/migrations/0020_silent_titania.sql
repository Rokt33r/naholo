ALTER TABLE "notes" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "notes_issue_id_name_idx" ON "notes" USING btree ("issue_id","name");--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "title";