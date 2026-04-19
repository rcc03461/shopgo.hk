import { createError, isError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { adminCreateProductBodySchema } from '../../../utils/productSchemas'
import { requireTenantSession } from '../../../utils/requireTenantSession'

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
    const [row] = await db
      .insert(schema.products)
      .values({
        tenantId: session.tenantId,
        slug: data.slug,
        title: data.title,
        description: data.description ?? null,
        basePrice: data.basePrice,
        imageUrls: data.imageUrls ?? [],
        updatedAt: new Date(),
      })
      .returning()

    if (!row) {
      throw createError({ statusCode: 500, message: '建立商品失敗' })
    }

    return { product: row }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此網址代號已被使用' })
    }
    console.error('[admin/products POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '建立商品失敗' })
  }
})
