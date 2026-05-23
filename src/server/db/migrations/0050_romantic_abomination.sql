ALTER TABLE "operation_objectives" RENAME TO "operation_tasks";--> statement-breakpoint
ALTER TABLE "operation_tasks" RENAME COLUMN "parent_objective_id" TO "parent_task_id";--> statement-breakpoint
ALTER TABLE "operation_tasks" DROP CONSTRAINT "operation_objectives_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_tasks" DROP CONSTRAINT "operation_objectives_operation_id_operations_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_tasks" DROP CONSTRAINT "operation_objectives_project_operator_id_project_operators_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_tasks" DROP CONSTRAINT "operation_objectives_parent_objective_id_operation_objectives_id_fk";
--> statement-breakpoint
ALTER TABLE "operation_tasks" ADD CONSTRAINT "operation_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_tasks" ADD CONSTRAINT "operation_tasks_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_tasks" ADD CONSTRAINT "operation_tasks_project_operator_id_project_operators_id_fk" FOREIGN KEY ("project_operator_id") REFERENCES "public"."project_operators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_tasks" ADD CONSTRAINT "operation_tasks_parent_task_id_operation_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."operation_tasks"("id") ON DELETE cascade ON UPDATE no action;