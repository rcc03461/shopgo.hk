import { and, eq, inArray } from 'drizzle-orm'
import { createError } from 'h3'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'
import type { adminPutProductCatalogBodySchema } from './productSchemas'
import type { z } from 'zod'

type CatalogBody = z.infer<typeof adminPutProductCatalogBodySchema>
type Db = PostgresJsDatabase<typeof schema>

function assertCatalogShape(body: CatalogBody) {
  const optLen = body.options.length

  for (const v of body.variants) {
    if (v.valueIndexes.length !== optLen) {
      throw createError({
        statusCode: 400,
        message: '每個 SKU 的規格索引數量須與規格類型數量相同',
      })
    }
    for (let i = 0; i < optLen; i++) {
      const max = body.options[i]!.values.length - 1
      const idx = v.valueIndexes[i]!
      if (idx < 0 || idx > max) {
        throw createError({
          statusCode: 400,
          message: `SKU「${v.skuCode}」的規格索引超出範圍`,
        })
      }
    }
  }

  if (optLen === 0) {
    for (const v of body.variants) {
      if (v.valueIndexes.length !== 0) {
        throw createError({
          statusCode: 400,
          message: '未設定規格時，SKU 不應帶有規格索引',
        })
      }
    }
  }

  const skuSeen = new Set<string>()
  for (const v of body.variants) {
    const key = v.skuCode.trim().toLowerCase()
    if (skuSeen.has(key)) {
      throw createError({ statusCode: 400, message: `SKU「${v.skuCode}」重複` })
    }
    skuSeen.add(key)
  }

  if (optLen > 0) {
    const comboSeen = new Set<string>()
    for (const v of body.variants) {
      const sig = v.valueIndexes.join(',')
      if (comboSeen.has(sig)) {
        throw createError({
          statusCode: 400,
          message: `SKU 規格組合重複（${sig}）`,
        })
      }
      comboSeen.add(sig)
    }
  }
}

export async function replaceProductCatalog(
  db: Db,
  tenantId: string,
  productId: string,
  body: CatalogBody,
) {
  assertCatalogShape(body)

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, productId),
          eq(schema.products.tenantId, tenantId),
        ),
      )
      .limit(1)

    if (!rows[0]) {
      throw createError({ statusCode: 404, message: '找不到商品' })
    }

    const existingVariants = await tx
      .select({
        id: schema.productVariants.id,
        skuCode: schema.productVariants.skuCode,
      })
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, productId))

    const oldVariantIdToSkuKey = new Map(
      existingVariants.map((v) => [v.id, v.skuCode.trim().toLowerCase()]),
    )

    /** 刪除 variant 前記錄購物車列，儲存後依 SKU 對回新 variant id（僅改庫存時 id 會變但 SKU 不變） */
    const cartLinesBeforeDelete =
      existingVariants.length > 0
        ? await tx
            .select({
              id: schema.shopCartLines.id,
              productVariantId: schema.shopCartLines.productVariantId,
            })
            .from(schema.shopCartLines)
            .where(
              inArray(
                schema.shopCartLines.productVariantId,
                existingVariants.map((v) => v.id),
              ),
            )
        : []

    if (existingVariants.length > 0) {
      const existingVariantIds = existingVariants.map((v) => v.id)
      // catalog 會重建 variants（id 會更新），先解除歷史引用避免 FK 阻擋刪除。
      await tx
        .update(schema.shopOrderLines)
        .set({ productVariantId: null })
        .where(
          inArray(schema.shopOrderLines.productVariantId, existingVariantIds),
        )

      await tx
        .update(schema.shopCartLines)
        .set({ productVariantId: null })
        .where(
          inArray(schema.shopCartLines.productVariantId, existingVariantIds),
        )
    }

    await tx
      .delete(schema.productVariants)
      .where(eq(schema.productVariants.productId, productId))

    await tx
      .delete(schema.productOptions)
      .where(eq(schema.productOptions.productId, productId))

    const valueMatrix: string[][] = []
    const newSkuKeyToVariantId = new Map<string, string>()

    for (const opt of body.options) {
      const [insertedOpt] = await tx
        .insert(schema.productOptions)
        .values({
          productId,
          name: opt.name,
          sortOrder: opt.sortOrder ?? 0,
        })
        .returning()

      if (!insertedOpt) {
        throw createError({ statusCode: 500, message: '建立規格類型失敗' })
      }

      const valueIds: string[] = []
      for (const val of opt.values) {
        const [row] = await tx
          .insert(schema.optionValues)
          .values({
            productOptionId: insertedOpt.id,
            value: val.value,
            sortOrder: val.sortOrder ?? 0,
          })
          .returning()
        if (!row) {
          throw createError({ statusCode: 500, message: '建立規格值失敗' })
        }
        valueIds.push(row.id)
      }
      valueMatrix.push(valueIds)
    }

    const optLen = body.options.length

    for (const v of body.variants) {
      const skuKey = v.skuCode.trim().toLowerCase()
      const [pv] = await tx
        .insert(schema.productVariants)
        .values({
          productId,
          skuCode: v.skuCode.trim(),
          price: v.price,
          stockQuantity: v.stockQuantity,
          imageUrl: v.imageUrl ?? null,
        })
        .returning()

      if (!pv) {
        throw createError({ statusCode: 500, message: '建立 SKU 失敗' })
      }
      newSkuKeyToVariantId.set(skuKey, pv.id)

      for (let i = 0; i < optLen; i++) {
        const vi = v.valueIndexes[i]!
        const optionValueId = valueMatrix[i]![vi]!
        await tx.insert(schema.variantOptionValues).values({
          productVariantId: pv.id,
          optionValueId,
        })
      }
    }

    for (const row of cartLinesBeforeDelete) {
      const oldVid = row.productVariantId
      if (!oldVid) continue
      const skuKey = oldVariantIdToSkuKey.get(oldVid)
      if (!skuKey) continue
      const newVid = newSkuKeyToVariantId.get(skuKey)
      if (!newVid) continue
      await tx
        .update(schema.shopCartLines)
        .set({ productVariantId: newVid, updatedAt: new Date() })
        .where(eq(schema.shopCartLines.id, row.id))
    }
  })
}
