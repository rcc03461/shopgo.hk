CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" text,
	"content_markdown" text DEFAULT '' NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"seo_title" varchar(255),
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "pages_tenant_id_slug_uidx" ON "pages" USING btree ("tenant_id","slug");
--> statement-breakpoint
CREATE INDEX "pages_tenant_id_idx" ON "pages" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "pages_tenant_status_idx" ON "pages" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX "pages_tenant_updated_idx" ON "pages" USING btree ("tenant_id","updated_at");
