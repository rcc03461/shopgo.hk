import { eq } from 'drizzle-orm'
import { createError, getRequestURL } from 'h3'
import type { H3Event } from 'h3'
import { parseTenantSlugFromHost } from '../../app/utils/tenantHost'
import * as schema from '../database/schema'
import { getDb } from './db'

/**
 * 公開店舖 API：依請求 Host 解析子網域 slug 並載入租戶（無需登入）。
 */
export async function requireStoreTenant(event: H3Event) {
  const config = useRuntimeConfig(event)
  const root = String(config.public.tenantRootDomain || 'oshop.com.hk')
  const host = getRequestURL(event).host
  const slug = parseTenantSlugFromHost(host, root)
  if (!slug) {
    throw createError({
      statusCode: 404,
      message: '請使用商店子網域存取',
    })
  }

  const db = getDb(event)
  const [tenant] = await db
    .select({
      id: schema.tenants.id,
      shopSlug: schema.tenants.shopSlug,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.shopSlug, slug))
    .limit(1)

  if (!tenant) {
    throw createError({ statusCode: 404, message: '找不到商店' })
  }

  return tenant
}
