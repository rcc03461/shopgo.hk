CREATE TABLE "tenant_custom_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"hostname" varchar(253) NOT NULL,
	"verification_token" text NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_custom_domains_hostname_unique" UNIQUE ("hostname")
);
--> statement-breakpoint
ALTER TABLE "tenant_custom_domains" ADD CONSTRAINT "tenant_custom_domains_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tenant_custom_domains_tenant_id_idx" ON "tenant_custom_domains" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "tenant_custom_domains_hostname_verified_partial_idx" ON "tenant_custom_domains" USING btree ("hostname") WHERE "verified_at" IS NOT NULL;
