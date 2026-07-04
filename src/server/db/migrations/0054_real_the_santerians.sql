ALTER TABLE "project_operators" ADD COLUMN "callsign" text;--> statement-breakpoint
UPDATE "project_operators" po
SET "callsign" = COALESCE(
  NULLIF(
    regexp_replace(
      lower(
        COALESCE(
          split_part(
            COALESCE(
              (SELECT ui.value FROM "user_identifiers" ui
               WHERE ui.user_id = po.user_id AND ui.type = 'email-otp'
               ORDER BY ui.created_at LIMIT 1),
              (SELECT ui.data->>'email' FROM "user_identifiers" ui
               WHERE ui.user_id = po.user_id AND ui.type = 'google-oauth'
               ORDER BY ui.created_at LIMIT 1)
            ),
            '@', 1
          ),
          po.name
        )
      ),
      '[^a-z0-9.-]', '.', 'g'
    ),
    ''
  ),
  'operator'
);--> statement-breakpoint
UPDATE "project_operators" po
SET "callsign" = po."callsign" || '.' || r.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY project_id, lower(callsign)
    ORDER BY created_at, id
  ) AS rn
  FROM "project_operators"
) r
WHERE r.id = po.id AND r.rn > 1;--> statement-breakpoint
ALTER TABLE "project_operators" ALTER COLUMN "callsign" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_operators_project_id_callsign_idx" ON "project_operators" USING btree ("project_id",lower("callsign"));
