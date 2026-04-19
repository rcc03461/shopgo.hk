CREATE TABLE "shop_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_public_id" uuid NOT NULL DEFAULT gen_random_uuid(),
	"status" varchar(32) DEFAULT 'pending_payment' NOT NULL,
	"payment_provider" varchar(32),
	"payment_reference" text,
	"currency" varchar(8) DEFAULT 'HKD' NOT NULL,
	"subtotal" numeric(14, 4) NOT NULL,
	"total" numeric(14, 4) NOT NULL,
	"customer_email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "shop_orders_invoice_public_id_uidx" ON "shop_orders" USING btree ("invoice_public_id");
--> statement-breakpoint
CREATE INDEX "shop_orders_tenant_id_idx" ON "shop_orders" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "shop_orders_tenant_status_idx" ON "shop_orders" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE TABLE "shop_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_variant_id" uuid,
	"title_snapshot" varchar(255) NOT NULL,
	"sku_snapshot" varchar(128) NOT NULL,
	"unit_price" numeric(14, 4) NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" numeric(14, 4) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop_order_lines" ADD CONSTRAINT "shop_order_lines_order_id_shop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_order_lines" ADD CONSTRAINT "shop_order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "shop_order_lines" ADD CONSTRAINT "shop_order_lines_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "shop_order_lines_order_id_idx" ON "shop_order_lines" USING btree ("order_id");
