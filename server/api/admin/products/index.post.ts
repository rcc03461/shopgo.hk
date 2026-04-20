import { eq } from 'drizzle-orm'
import { createError, isError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { adminCreateProductBodySchema } from '../../../utils/productSchemas'
import { requireTenantSession } from '../../../utils/requireTenantSession'
import { syncProductMedia } from '../../../utils/productAttachmentSync'
import { syncProductCategories } from '../../../utils/productCategorySync'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const body = await readBody(event)
  const parsed = adminCreateProductBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const db = getDb(event)
  const data = parsed.data

  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.products)
        .values({
          tenantId: session.tenantId,
          slug: data.slug,
          title: data.title,
          description: data.description ?? null,
          basePrice: data.basePrice,
          originalPrice: data.originalPrice ?? null,
          coverAttachmentId: null,
          updatedAt: new Date(),
        })
        .returning()

      if (!row) {
        throw createError({ statusCode: 500, message: '建立商品失敗' })
      }

      await syncProductMedia(tx, session.tenantId, row.id, {
        coverAttachmentId: data.coverAttachmentId ?? null,
        galleryAttachmentIds: data.galleryAttachmentIds ?? [],
      })

      await syncProductCategories(
        tx,
        session.tenantId,
        row.id,
        data.categoryIds ?? [],
      )

      const [out] = await tx
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, row.id))
        .limit(1)

      return out ?? row
    })

    return {
      product: {
        ...result,
        basePrice: String(result.basePrice),
        originalPrice: result.originalPrice ? String(result.originalPrice) : null,
      },
    }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此網址代號已被使用' })
    }
    console.error('[admin/products POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '建立商品失敗' })
  }
})
