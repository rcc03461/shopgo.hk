import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { createError } from 'h3'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

type Db = PostgresJsDatabase<typeof schema>

export type ProductDetailAttachmentMode = 'admin' | 'public'

function serializeAttachment(
  row: typeof schema.attachments.$inferSelect,
  mode: ProductDetailAttachmentMode,
) {
  const base = {
    id: row.id,
    type: row.type,
    mimetype: row.mimetype,
    filename: row.filename,
    extension: row.extension,
    publicUrl: row.publicUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
  if (mode === 'admin') {
    return {
      ...base,
      size: row.size,
      storageKey: row.storageKey,
    }
  }
  return base
}

export type ProductDetailFinder =
  | { kind: 'id'; productId: string }
  | { kind: 'slug'; slug: string }

export async function loadProductDetailForTenant(
  db: Db,
  tenantId: string,
  finder: ProductDetailFinder,
  attachmentMode: ProductDetailAttachmentMode,
) {
  const where =
    finder.kind === 'id'
      ? and(
          eq(schema.products.id, finder.productId),
          eq(schema.products.tenantId, tenantId),
        )
      : and(
          eq(schema.products.slug, finder.slug),
          eq(schema.products.tenantId, tenantId),
        )

  const [product] = await db
    .select()
    .from(schema.products)
    .where(where)
    .limit(1)

  if (!product) return null

  const productId = product.id

  let cover: ReturnType<typeof serializeAttachment> | null = null
  if (product.coverAttachmentId) {
    const [c] = await db
      .select()
      .from(schema.attachments)
      .where(
        and(
          eq(schema.attachments.id, product.coverAttachmentId),
          eq(schema.attachments.tenantId, tenantId),
          isNull(schema.attachments.deletedAt),
        ),
      )
      .limit(1)
    if (c) cover = serializeAttachment(c, attachmentMode)
  }

  const galleryRows = await db
    .select({ attachment: schema.attachments })
    .from(schema.attachmentEntityLinks)
    .innerJoin(
      schema.attachments,
      eq(schema.attachmentEntityLinks.attachmentId, schema.attachments.id),
    )
    .where(
      and(
        eq(schema.attachmentEntityLinks.entityType, 'product'),
        eq(schema.attachmentEntityLinks.entityId, productId),
        isNull(schema.attachments.deletedAt),
      ),
    )
    .orderBy(
      asc(schema.attachmentEntityLinks.sortOrder),
      asc(schema.attachmentEntityLinks.id),
    )

  const galleryAttachments = galleryRows.map((r) =>
    serializeAttachment(r.attachment, attachmentMode),
  )

  const categoryRows = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      sortOrder: schema.productCategories.sortOrder,
    })
    .from(schema.productCategories)
    .innerJoin(
      schema.categories,
      eq(schema.productCategories.categoryId, schema.categories.id),
    )
    .where(
      and(
        eq(schema.productCategories.productId, productId),
        eq(schema.categories.tenantId, tenantId),
      ),
    )
    .orderBy(
      asc(schema.productCategories.sortOrder),
      asc(schema.productCategories.id),
    )

  const categoriesOut = categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    sortOrder: c.sortOrder,
  }))

  const options = await db
    .select()
    .from(schema.productOptions)
    .where(eq(schema.productOptions.productId, productId))
    .orderBy(asc(schema.productOptions.sortOrder), asc(schema.productOptions.id))

  const optionIds = options.map((o) => o.id)
  const allValues =
    optionIds.length === 0
      ? []
      : await db
          .select()
          .from(schema.optionValues)
          .where(inArray(schema.optionValues.productOptionId, optionIds))

  const valuesByOption = new Map<string, typeof allValues>()
  for (const opt of options) {
    const list = allValues
      .filter((v) => v.productOptionId === opt.id)
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          String(a.id).localeCompare(String(b.id)),
      )
    valuesByOption.set(opt.id, list)
  }

  const variants = await db
    .select()
    .from(schema.productVariants)
    .where(eq(schema.productVariants.productId, productId))
    .orderBy(asc(schema.productVariants.skuCode))

  const variantIds = variants.map((v) => v.id)
  const links =
    variantIds.length === 0
      ? []
      : await db
          .select()
          .from(schema.variantOptionValues)
          .where(
            inArray(schema.variantOptionValues.productVariantId, variantIds),
          )

  const linksByVariant = new Map<string, Set<string>>()
  for (const l of links) {
    const set = linksByVariant.get(l.productVariantId) ?? new Set<string>()
    set.add(l.optionValueId)
    linksByVariant.set(l.productVariantId, set)
  }

  const optionsOut = options.map((opt) => ({
    id: opt.id,
    name: opt.name,
    sortOrder: opt.sortOrder,
    values: (valuesByOption.get(opt.id) ?? []).map((v) => ({
      id: v.id,
      value: v.value,
      sortOrder: v.sortOrder,
    })),
  }))

  const variantsOut = variants.map((v) => {
    const chosen = linksByVariant.get(v.id) ?? new Set<string>()
    const valueIndexes = optionsOut.map((opt) => {
      const vals = opt.values
      const hit = vals.find((val) => chosen.has(val.id))
      if (!hit) {
        throw createError({
          statusCode: 500,
          message: `SKU「${v.skuCode}」缺少對應的規格資料`,
        })
      }
      return vals.findIndex((x) => x.id === hit.id)
    })

    return {
      id: v.id,
      skuCode: v.skuCode,
      price: String(v.price),
      stockQuantity: v.stockQuantity,
      imageUrl: v.imageUrl,
      valueIndexes,
    }
  })

  return {
    product: {
      id: product.id,
      tenantId: product.tenantId,
      slug: product.slug,
      title: product.title,
      description: product.description,
      basePrice: String(product.basePrice),
      coverAttachmentId: product.coverAttachmentId,
      cover,
      galleryAttachments,
      categories: categoriesOut,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    },
    options: optionsOut,
    variants: variantsOut,
  }
}
