ALTER TABLE "projects" ADD COLUMN "slug" text;
UPDATE projects SET slug = id::text;