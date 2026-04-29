import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { cloudflareDeleteCustomHostname } from '../../../utils/cloudflareCustomHostnames'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('自訂網域 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!parsed.success) {
    throw createError({ statusCode: 404, message: parsed.error.issues[0]?.message })
  }
  const id = parsed.data
  const db = getDb(event)

  const [row] = await db
    .select({
      cfCustomHostnameId: schema.tenantCustomDomains.cfCustomHostnameId,
    })
    .from(schema.tenantCustomDomains)
    .where(
      and(
        eq(schema.tenantCustomDomains.id, id),
        eq(schema.tenantCustomDomains.tenantId, session.tenantId),
      ),
    )
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, message: '找不到自訂網域' })
  }

  const rc = useRuntimeConfig(event)
  const cfToken = String(rc.cloudflareApiToken || '').trim()
  const cfZone = String(rc.cloudflareZoneId || '').trim()

  if (row.cfCustomHostnameId && cfToken && cfZone) {
    const del = await cloudflareDeleteCustomHostname(
      cfToken,
      cfZone,
      row.cfCustomHostnameId,
    )
    if (!del.ok) {
      console.error(
        `[custom-domains DELETE] Cloudflare 刪除 custom hostname 失敗: ${del.message}`,
      )
      throw createError({
        statusCode: 502,
        message: `無法從 Cloudflare 移除網域：${del.message}`,
      })
    }
  }

  const [deleted] = await db
    .delete(schema.tenantCustomDomains)
    .where(
      and(
        eq(schema.tenantCustomDomains.id, id),
        eq(schema.tenantCustomDomains.tenantId, session.tenantId),
      ),
    )
    .returning({ id: schema.tenantCustomDomains.id })

  if (!deleted) {
    throw createError({ statusCode: 404, message: '找不到自訂網域' })
  }

  return { ok: true }
})
