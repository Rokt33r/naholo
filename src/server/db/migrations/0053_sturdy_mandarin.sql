CREATE TABLE "project_labels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_project_labels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"operation_id" uuid NOT NULL,
	"project_label_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_assignees" (
	"id" uuid PRIMARY KEY NOT NULL,
	"operation_id" uuid NOT NULL,
	"project_operator_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_labels" ADD CONSTRAINT "project_labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_project_labels" ADD CONSTRAINT "operation_project_labels_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_project_labels" ADD CONSTRAINT "operation_project_labels_project_label_id_project_labels_id_fk" FOREIGN KEY ("project_label_id") REFERENCES "public"."project_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_assignees" ADD CONSTRAINT "operation_assignees_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_assignees" ADD CONSTRAINT "operation_assignees_project_operator_id_project_operators_id_fk" FOREIGN KEY ("project_operator_id") REFERENCES "public"."project_operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_labels_project_id_name_idx" ON "project_labels" USING btree ("project_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "operation_project_labels_operation_id_project_label_id_idx" ON "operation_project_labels" USING btree ("operation_id","project_label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "operation_assignees_operation_id_project_operator_id_idx" ON "operation_assignees" USING btree ("operation_id","project_operator_id");