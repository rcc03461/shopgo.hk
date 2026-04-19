import { createError } from 'h3'
import { z } from 'zod'
import { getDb } from '../../../utils/db'
import { loadProductDetailForTenant } from '../../../utils/productDetailForTenant'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('商品 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 404, message: idParsed.error.issues[0]?.message })
  }

  const db = getDb(event)
  const payload = await loadProductDetailForTenant(
    db,
    session.tenantId,
    { kind: 'id', productId: idParsed.data },
    'admin',
  )

  if (!payload) {
    throw createError({ statusCode: 404, message: '找不到商品' })
  }

  return payload
})
