import { createError, isError } from 'h3'
import { z } from 'zod'
import { replaceProductCatalog } from '../../../../utils/adminProductCatalog'
import { getDb } from '../../../../utils/db'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../../utils/dbErrors'
import { adminPutProductCatalogBodySchema } from '../../../../utils/productSchemas'
import { requireTenantSession } from '../../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('商品 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 404, message: idParsed.error.issues[0]?.message })
  }
  const productId = idParsed.data

  const body = await readBody(event)
  const parsed = adminPutProductCatalogBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const db = getDb(event)

  try {
    await replaceProductCatalog(db, session.tenantId, productId, parsed.data)
    return { ok: true as const }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: 'SKU 代號與現有資料衝突' })
    }
    if (getPgSqlState(e) === '23001') {
      throw createError({ statusCode: 409, message: '部分 SKU 已有訂單，請勿刪除該 SKU' })
    }
    console.error('[admin/products catalog PUT]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '儲存規格失敗' })
  }
})
