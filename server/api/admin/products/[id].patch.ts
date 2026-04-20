import { and, eq } from 'drizzle-orm'
import { createError, isError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import {
  loadProductGalleryIds,
  syncProductMedia,
} from '../../../utils/productAttachmentSync'
import { syncProductCategories } from '../../../utils/productCategorySync'
import { adminPatchProductBodySchema } from '../../../utils/productSchemas'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('商品 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 404, message: idParsed.error.issues[0]?.message })
  }
  const productId = idParsed.data

  const body = await readBody(event)
  const parsed = adminPatchProductBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const patch = parsed.data
  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, message: '沒有要更新的欄位' })
  }

  const wantsMedia =
    'coverAttachmentId' in patch || 'galleryAttachmentIds' in patch

  const wantsCategories = 'categoryIds' in patch

  const db = getDb(event)

  try {
    const updated = await db.transaction(async (tx) => {
      const [cur] = await tx
        .select({
          coverAttachmentId: schema.products.coverAttachmentId,
        })
        .from(schema.products)
        .where(
          and(
            eq(schema.products.id, productId),
            eq(schema.products.tenantId, session.tenantId),
          ),
        )
        .limit(1)

      if (!cur) {
        throw createError({ statusCode: 404, message: '找不到商品' })
      }

      const curGallery = await loadProductGalleryIds(tx, productId)

      const next: Partial<typeof schema.products.$inferInsert> = {
        updatedAt: new Date(),
      }
      if (patch.title !== undefined) next.title = patch.title
      if (patch.slug !== undefined) next.slug = patch.slug
      if (patch.description !== undefined) next.description = patch.description
      if (patch.basePrice !== undefined) next.basePrice = patch.basePrice
      if (patch.originalPrice !== undefined) {
        next.originalPrice = patch.originalPrice
      }

      const hasTextField =
        patch.title !== undefined ||
        patch.slug !== undefined ||
        patch.description !== undefined ||
        patch.basePrice !== undefined ||
        patch.originalPrice !== undefined

      if (hasTextField || wantsMedia) {
        const [row] = await tx
          .update(schema.products)
          .set(next)
          .where(
            and(
              eq(schema.products.id, productId),
              eq(schema.products.tenantId, session.tenantId),
            ),
          )
          .returning()

        if (!row) {
          throw createError({ statusCode: 404, message: '找不到商品' })
        }
      }

      if (wantsMedia) {
        const cover =
          'coverAttachmentId' in patch
            ? (patch.coverAttachmentId ?? null)
            : cur.coverAttachmentId
        const gallery =
          'galleryAttachmentIds' in patch
            ? (patch.galleryAttachmentIds ?? [])
            : curGallery

        await syncProductMedia(tx, session.tenantId, productId, {
          coverAttachmentId: cover,
          galleryAttachmentIds: gallery,
        })
      }

      if (wantsCategories) {
        await syncProductCategories(
          tx,
          session.tenantId,
          productId,
          patch.categoryIds ?? [],
        )
      }

      const [finalRow] = await tx
        .select()
        .from(schema.products)
        .where(
          and(
            eq(schema.products.id, productId),
            eq(schema.products.tenantId, session.tenantId),
          ),
        )
        .limit(1)

      return finalRow
    })

    if (!updated) {
      throw createError({ statusCode: 404, message: '找不到商品' })
    }

    return {
      product: {
        ...updated,
        basePrice: String(updated.basePrice),
        originalPrice: updated.originalPrice ? String(updated.originalPrice) : null,
      },
    }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此網址代號已被使用' })
    }
    console.error('[admin/products PATCH]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '更新商品失敗' })
  }
})
