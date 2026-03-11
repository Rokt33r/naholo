CREATE TABLE "naholo_email_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "naholo_email_addresses_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "naholo_email_addresses_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "naholo_received_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"naholo_email_address_id" uuid NOT NULL,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"body_text" text,
	"body_html" text,
	"s3_key" text,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "naholo_sent_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"naholo_email_address_id" uuid NOT NULL,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"body_text" text,
	"body_html" text,
	"ses_message_id" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "naholo_email_addresses" ADD CONSTRAINT "naholo_email_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "naholo_received_emails" ADD CONSTRAINT "naholo_received_emails_naholo_email_address_id_naholo_email_addresses_id_fk" FOREIGN KEY ("naholo_email_address_id") REFERENCES "public"."naholo_email_addresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "naholo_sent_emails" ADD CONSTRAINT "naholo_sent_emails_naholo_email_address_id_naholo_email_addresses_id_fk" FOREIGN KEY ("naholo_email_address_id") REFERENCES "public"."naholo_email_addresses"("id") ON DELETE cascade ON UPDATE no action;