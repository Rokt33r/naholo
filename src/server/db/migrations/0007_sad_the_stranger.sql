ALTER TABLE "issues" ADD COLUMN "project_worker_id" uuid;--> statement-breakpoint
ALTER TABLE "logs" ADD COLUMN "project_worker_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "project_worker_id" uuid;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "project_worker_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_worker_id_project_workers_id_fk" FOREIGN KEY ("project_worker_id") REFERENCES "public"."project_workers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_project_worker_id_project_workers_id_fk" FOREIGN KEY ("project_worker_id") REFERENCES "public"."project_workers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_worker_id_project_workers_id_fk" FOREIGN KEY ("project_worker_id") REFERENCES "public"."project_workers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_project_worker_id_project_workers_id_fk" FOREIGN KEY ("project_worker_id") REFERENCES "public"."project_workers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE issues i
SET project_worker_id = pw.id
FROM project_workers pw
WHERE pw.project_id = i.project_id AND pw.user_id = i.user_id;--> statement-breakpoint
UPDATE tasks t
SET project_worker_id = pw.id
FROM project_workers pw
WHERE pw.project_id = t.project_id AND pw.user_id = t.user_id;--> statement-breakpoint
UPDATE notes n
SET project_worker_id = pw.id
FROM project_workers pw
WHERE pw.project_id = n.project_id AND pw.user_id = n.user_id;--> statement-breakpoint
UPDATE logs l
SET project_worker_id = pw.id
FROM project_workers pw
WHERE pw.project_id = l.project_id AND pw.user_id = l.user_id;