CREATE TABLE "operation_note_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operation_notes" ADD COLUMN "current_revision_id" uuid;--> statement-breakpoint
ALTER TABLE "operation_note_revisions" ADD CONSTRAINT "operation_note_revisions_note_id_operation_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."operation_notes"("id") ON DELETE cascade ON UPDATE no action;

-- Backfill: create initial revisions for existing notes
INSERT INTO "operation_note_revisions" ("id", "note_id", "content", "created_at")
SELECT gen_random_uuid(), "id", "content", "created_at"
FROM "operation_notes";

-- Backfill: point each note to its initial revision
UPDATE "operation_notes"
SET "current_revision_id" = r."id"
FROM "operation_note_revisions" r
WHERE r."note_id" = "operation_notes"."id";