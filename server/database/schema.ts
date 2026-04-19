import { sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  bigint,
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

/** 商店前台／後台設定（不需單獨索引搜尋的欄位集中於此 JSON） */
export type TenantSettingsJson = Record<string, unknown>

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopSlug: varchar('shop_slug', { length: 64 }).notNull().unique(),
  /** 店名、Logo、聯絡方式、社群連結等非結構化設定 */
  settings: jsonb('settings')
    .$type<TenantSettingsJson>()
    .notNull()
    .default(sql`'{}'::jsonb`),
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

/**
 * 上傳／外部檔案紀錄（租戶隔離；`size` 供用量統計）
 * `public_url` 與 `storage_key` 至少其一有值（由應用層驗證）
 */
export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 32 }).notNull(),
    mimetype: varchar('mimetype', { length: 128 }).notNull(),
    filename: varchar('filename', { length: 255 }).notNull(),
    extension: varchar('extension', { length: 32 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull().default(0),
    storageKey: text('storage_key'),
    publicUrl: text('public_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('attachments_tenant_id_idx').on(t.tenantId),
    index('attachments_tenant_deleted_idx').on(t.tenantId, t.deletedAt),
  ],
)

/**
 * 附件與實體的多型關聯（例：商品圖庫）
 */
export const attachmentEntityLinks = pgTable(
  'attachment_entity_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    attachmentId: uuid('attachment_id')
      .notNull()
      .references(() => attachments.id, { onDelete: 'cascade' }),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('attachment_entity_links_entity_attachment_uidx').on(
      t.entityType,
      t.entityId,
      t.attachmentId,
    ),
    index('attachment_entity_links_entity_idx').on(t.entityType, t.entityId),
  ],
)

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
    coverAttachmentId: uuid('cover_attachment_id').references(
      () => attachments.id,
      { onDelete: 'set null' },
    ),
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

/** 租戶商品分類（可選父子層級；前台 slug 在租戶內唯一） */
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'set null',
    }),
    sortOrder: integer('sort_order').notNull().default(0),
    slug: varchar('slug', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('categories_tenant_id_slug_uidx').on(t.tenantId, t.slug),
    index('categories_tenant_id_idx').on(t.tenantId),
    index('categories_parent_id_idx').on(t.parentId),
  ],
)

/** 商品與分類多對多（`sort_order` 為該商品上的分類排序） */
export const productCategories = pgTable(
  'product_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    uniqueIndex('product_categories_product_category_uidx').on(
      t.productId,
      t.categoryId,
    ),
    index('product_categories_product_id_idx').on(t.productId),
    index('product_categories_category_id_idx').on(t.categoryId),
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
