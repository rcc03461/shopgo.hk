import { and, asc, eq, inArray } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('商品 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 404, message: idParsed.error.issues[0]?.message })
  }
  const productId = idParsed.data

  const db = getDb(event)

  const [product] = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.id, productId),
        eq(schema.products.tenantId, session.tenantId),
      ),
    )
    .limit(1)

  if (!product) {
    throw createError({ statusCode: 404, message: '找不到商品' })
  }

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
      ...product,
      basePrice: String(product.basePrice),
    },
    options: optionsOut,
    variants: variantsOut,
  }
})
