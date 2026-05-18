ALTER TABLE "project_subscriptions" DROP CONSTRAINT "project_subscriptions_created_by_operator_id_project_operators_id_fk";
--> statement-breakpoint
ALTER TABLE "project_subscriptions" DROP COLUMN "created_by_operator_id";