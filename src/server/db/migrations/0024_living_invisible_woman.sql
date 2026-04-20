ALTER TABLE "issues" RENAME TO "operations";--> statement-breakpoint
ALTER TABLE "logs" RENAME TO "operation_logs";--> statement-breakpoint
ALTER TABLE "tasks" RENAME TO "operation_objectives";--> statement-breakpoint
ALTER TABLE "notes" RENAME TO "operation_notes";--> statement-breakpoint
ALTER TABLE "project_workers" RENAME TO "project_operators";--> statement-breakpoint
ALTER TABLE "project_worker_api_tokens" RENAME TO "project_operator_api_tokens";--> statement-breakpoint
ALTER TABLE "skill_sets" RENAME TO "skill_loadouts";--> statement-breakpoint
ALTER TABLE "projects" RENAME COLUMN "issue_counter" TO "operation_counter";--> statement-breakpoint
ALTER TABLE "operations" RENAME COLUMN "project_worker_id" TO "project_operator_id";--> statement-breakpoint
ALTER TABLE "operations" RENAME COLUMN "last_log_preview" TO "last_operation_log_preview";--> statement-breakpoint
ALTER TABLE "operation_logs" RENAME COLUMN "issue_id" TO "operation_id";--> statement-breakpoint
ALTER TABLE "operation_logs" RENAME COLUMN "project_worker_id" TO "project_operator_id";--> statement-breakpoint
ALTER TABLE "operation_objectives" RENAME COLUMN "issue_id" TO "operation_id";--> statement-breakpoint
ALTER TABLE "operation_objectives" RENAME COLUMN "project_worker_id" TO "project_operator_id";--> statement-breakpoint
ALTER TABLE "operation_objectives" RENAME COLUMN "parent_task_id" TO "parent_objective_id";--> statement-breakpoint
ALTER TABLE "operation_notes" RENAME COLUMN "issue_id" TO "operation_id";--> statement-breakpoint
ALTER TABLE "operation_notes" RENAME COLUMN "project_worker_id" TO "project_operator_id";--> statement-breakpoint
ALTER TABLE "project_operator_api_tokens" RENAME COLUMN "project_worker_id" TO "project_operator_id";--> statement-breakpoint
ALTER TABLE "skills" RENAME COLUMN "skill_set_id" TO "skill_loadout_id";--> statement-breakpoint
ALTER TABLE "project_invites" RENAME COLUMN "inviter_project_worker_id" TO "inviter_project_operator_id";--> statement-breakpoint
ALTER TABLE "operations" DROP CONSTRAINT "issues_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "operations" DROP CONSTRAINT "issues_project_worker_id_project_workers_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_logs" DROP CONSTRAINT "logs_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_logs" DROP CONSTRAINT "logs_issue_id_issues_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_logs" DROP CONSTRAINT "logs_project_worker_id_project_workers_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_objectives" DROP CONSTRAINT "tasks_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_objectives" DROP CONSTRAINT "tasks_issue_id_issues_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_objectives" DROP CONSTRAINT "tasks_project_worker_id_project_workers_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_objectives" DROP CONSTRAINT "tasks_parent_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_notes" DROP CONSTRAINT "notes_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_notes" DROP CONSTRAINT "notes_issue_id_issues_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_notes" DROP CONSTRAINT "notes_project_worker_id_project_workers_id_fk";
--> statement-breakpoint
ALTER TABLE "project_operators" DROP CONSTRAINT "project_workers_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "project_operators" DROP CONSTRAINT "project_workers_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "project_operator_api_tokens" DROP CONSTRAINT "project_worker_api_tokens_project_worker_id_project_workers_id_fk";
--> statement-breakpoint
ALTER TABLE "skill_loadouts" DROP CONSTRAINT "skill_sets_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "skills" DROP CONSTRAINT "skills_skill_set_id_skill_sets_id_fk";
--> statement-breakpoint
ALTER TABLE "project_invites" DROP CONSTRAINT "project_invites_inviter_project_worker_id_project_workers_id_fk";
--> statement-breakpoint
DROP INDEX "issues_project_id_number_idx";--> statement-breakpoint
DROP INDEX "notes_issue_id_name_idx";--> statement-breakpoint
DROP INDEX "skill_sets_project_id_slug_unique";--> statement-breakpoint
DROP INDEX "skills_skill_set_id_name_unique";--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_project_operator_id_project_operators_id_fk" FOREIGN KEY ("project_operator_id") REFERENCES "public"."project_operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_project_operator_id_project_operators_id_fk" FOREIGN KEY ("project_operator_id") REFERENCES "public"."project_operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_objectives" ADD CONSTRAINT "operation_objectives_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_objectives" ADD CONSTRAINT "operation_objectives_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_objectives" ADD CONSTRAINT "operation_objectives_project_operator_id_project_operators_id_fk" FOREIGN KEY ("project_operator_id") REFERENCES "public"."project_operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_objectives" ADD CONSTRAINT "operation_objectives_parent_objective_id_operation_objectives_id_fk" FOREIGN KEY ("parent_objective_id") REFERENCES "public"."operation_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_notes" ADD CONSTRAINT "operation_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_notes" ADD CONSTRAINT "operation_notes_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_notes" ADD CONSTRAINT "operation_notes_project_operator_id_project_operators_id_fk" FOREIGN KEY ("project_operator_id") REFERENCES "public"."project_operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_operators" ADD CONSTRAINT "project_operators_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_operators" ADD CONSTRAINT "project_operators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_operator_api_tokens" ADD CONSTRAINT "project_operator_api_tokens_project_operator_id_project_operators_id_fk" FOREIGN KEY ("project_operator_id") REFERENCES "public"."project_operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_loadouts" ADD CONSTRAINT "skill_loadouts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_skill_loadout_id_skill_loadouts_id_fk" FOREIGN KEY ("skill_loadout_id") REFERENCES "public"."skill_loadouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invites" ADD CONSTRAINT "project_invites_inviter_project_operator_id_project_operators_id_fk" FOREIGN KEY ("inviter_project_operator_id") REFERENCES "public"."project_operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "operations_project_id_number_idx" ON "operations" USING btree ("project_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "operation_notes_operation_id_name_idx" ON "operation_notes" USING btree ("operation_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_loadouts_project_id_slug_unique" ON "skill_loadouts" USING btree ("project_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_skill_loadout_id_name_unique" ON "skills" USING btree ("skill_loadout_id","name");