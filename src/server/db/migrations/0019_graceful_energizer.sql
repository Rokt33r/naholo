ALTER TABLE "notes" ADD COLUMN "name" text;
-- Backfill name from title with unique suffix
UPDATE notes SET name = regexp_replace(
  regexp_replace(
    trim(title),
    '\s+', '-', 'g'
  ),
  '-+', '-', 'g'
) || '-' || left(id::text, 8);