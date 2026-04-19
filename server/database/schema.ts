import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopSlug: varchar('shop_slug', { length: 64 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

/** 租戶商品主檔（前台路由用 slug，後台用 id） */
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    basePrice: numeric('base_price', { precision: 14, scale: 4 })
      .notNull()
      .default('0'),
    imageUrls: jsonb('image_urls')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('products_tenant_id_slug_uidx').on(t.tenantId, t.slug),
    index('products_tenant_id_idx').on(t.tenantId),
  ],
)

export const productOptions = pgTable(
  'product_options',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('product_options_product_id_idx').on(t.productId)],
)

export const optionValues = pgTable(
  'option_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productOptionId: uuid('product_option_id')
      .notNull()
      .references(() => productOptions.id, { onDelete: 'cascade' }),
    value: varchar('value', { length: 255 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('option_values_product_option_id_idx').on(t.productOptionId)],
)

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    skuCode: varchar('sku_code', { length: 128 }).notNull(),
    price: numeric('price', { precision: 14, scale: 4 }).notNull(),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('product_variants_product_id_sku_code_uidx').on(
      t.productId,
      t.skuCode,
    ),
    index('product_variants_product_id_idx').on(t.productId),
  ],
)

export const variantOptionValues = pgTable(
  'variant_option_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productVariantId: uuid('product_variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    optionValueId: uuid('option_value_id')
      .notNull()
      .references(() => optionValues.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('variant_option_values_variant_value_uidx').on(
      t.productVariantId,
      t.optionValueId,
    ),
    index('variant_option_values_variant_id_idx').on(t.productVariantId),
  ],
)
