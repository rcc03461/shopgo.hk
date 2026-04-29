import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../../database/schema'
import { getDb } from '../../../../utils/db'
import { cloudflarePatchCustomHostname } from '../../../../utils/cloudflareCustomHostnames'
import { requireTenantSession } from '../../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('自訂網域 id 格式不正確')

/**
 * 將既有 Custom Hostname 補上 `custom_origin_server`（與 NUXT_PUBLIC_SAAS_CNAME_TARGET 相同），
 * 用於修正「Origin SNI = Host header」導致來源 525 的狀況。
 */
export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!parsed.success) {
    throw createError({ statusCode: 404, message: parsed.error.issues[0]?.message })
  }
  const id = parsed.data
  const db = getDb(event)
  const rc = useRuntimeConfig(event)

  const saasFallback = String(rc.public?.saasCnameTarget || '').trim()
  if (!saasFallback) {
    throw createError({
      statusCode: 400,
      message: '平台未設定 NUXT_PUBLIC_SAAS_CNAME_TARGET（須與 Fallback Origin 相同）',
    })
  }

  const cfToken = String(rc.cloudflareApiToken || '').trim()
  const cfZone = String(rc.cloudflareZoneId || '').trim()
  if (!cfToken || !cfZone) {
    throw createError({
      statusCode: 400,
      message: '未設定 CLOUDFLARE_API_TOKEN 或 CLOUDFLARE_ZONE_ID',
    })
  }

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

  if (!row?.cfCustomHostnameId) {
    throw createError({
      statusCode: 400,
      message: '此網域尚未關聯 Cloudflare Custom Hostname id，無法修補',
    })
  }

  const patch = await cloudflarePatchCustomHostname(
    cfToken,
    cfZone,
    row.cfCustomHostnameId,
    { customOriginServer: saasFallback },
  )

  if (!patch.ok) {
    console.error(`[repair-cf-origin] ${patch.message}`)
    throw createError({
      statusCode: 502,
      message: `Cloudflare 更新失敗：${patch.message}`,
    })
  }

  return { ok: true as const }
})
