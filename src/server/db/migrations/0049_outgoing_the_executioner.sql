ALTER TABLE "project_operators" DROP CONSTRAINT "project_operators_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "project_operators" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_operators" ADD CONSTRAINT "project_operators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;