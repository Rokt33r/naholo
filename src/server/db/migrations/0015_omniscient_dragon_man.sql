ALTER TABLE "projects" ADD COLUMN "issue_counter" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "number" integer;--> statement-breakpoint
ALTER TABLE "skills" DROP COLUMN "position";--> statement-breakpoint

-- Backfill issue numbers per project, ordered by created_at
WITH numbered AS (
  SELECT id, project_id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) AS rn
  FROM issues
)
UPDATE issues SET number = numbered.rn FROM numbered WHERE issues.id = numbered.id;--> statement-breakpoint

-- Update project issue counters to match
UPDATE projects SET issue_counter = sub.cnt
FROM (SELECT project_id, COUNT(*) AS cnt FROM issues GROUP BY project_id) AS sub
WHERE projects.id = sub.project_id;--> statement-breakpoint
