import { and, eq } from 'drizzle-orm'
import { createError, isError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
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

  const db = getDb(event)

  const next: Partial<typeof schema.products.$inferInsert> = {
    updatedAt: new Date(),
  }
  if (patch.title !== undefined) next.title = patch.title
  if (patch.slug !== undefined) next.slug = patch.slug
  if (patch.description !== undefined) next.description = patch.description
  if (patch.basePrice !== undefined) next.basePrice = patch.basePrice
  if (patch.imageUrls !== undefined) next.imageUrls = patch.imageUrls

  try {
    const [updated] = await db
      .update(schema.products)
      .set(next)
      .where(
        and(
          eq(schema.products.id, productId),
          eq(schema.products.tenantId, session.tenantId),
        ),
      )
      .returning()

    if (!updated) {
      throw createError({ statusCode: 404, message: '找不到商品' })
    }

    return { product: { ...updated, basePrice: String(updated.basePrice) } }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此網址代號已被使用' })
    }
    console.error('[admin/products PATCH]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '更新商品失敗' })
  }
})
