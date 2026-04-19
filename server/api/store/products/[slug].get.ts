import { createError } from 'h3'
import { getDb } from '../../../utils/db'
import { loadProductDetailForTenant } from '../../../utils/productDetailForTenant'
import { requireStoreTenant } from '../../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const slug = getRouterParam(event, 'slug')
  if (!slug || !slug.trim()) {
    throw createError({ statusCode: 404, message: '找不到商品' })
  }

  const db = getDb(event)
  const payload = await loadProductDetailForTenant(
    db,
    tenant.id,
    { kind: 'slug', slug: slug.trim() },
    'public',
  )

  if (!payload) {
    throw createError({ statusCode: 404, message: '找不到商品' })
  }

  const { tenantId: _t, ...productRest } = payload.product

  return {
    product: productRest,
    options: payload.options,
    variants: payload.variants,
  }
})
