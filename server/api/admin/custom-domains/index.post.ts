import { randomBytes } from 'node:crypto'
import { createError, isError, readBody } from 'h3'
import { eq } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { normalizeRequestHostname } from '../../../../app/utils/hostNormalize'
import { getDb } from '../../../utils/db'
import { assertCustomDomainHostnameAllowed } from '../../../utils/customDomainHostnamePolicy'
import { cloudflareCreateCustomHostname } from '../../../utils/cloudflareCustomHostnames'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const root = String(
    useRuntimeConfig(event).public.tenantRootDomain || 'shopgo.com.hk',
  ).trim()

  const body = (await readBody(event)) as { hostname?: unknown }
  const raw =
    typeof body?.hostname === 'string' ? body.hostname.trim() : ''
  const normalized = normalizeRequestHostname(raw)
  if (normalized === null) {
    throw createError({ statusCode: 400, message: '網域格式無效' })
  }

  assertCustomDomainHostnameAllowed(normalized, root)

  const verificationToken = randomBytes(32).toString('hex')
  const db = getDb(event)

  try {
    const [row] = await db
      .insert(schema.tenantCustomDomains)
      .values({
        tenantId: session.tenantId,
        hostname: normalized,
        verificationToken,
        verifiedAt: null,
      })
      .returning({
        id: schema.tenantCustomDomains.id,
        hostname: schema.tenantCustomDomains.hostname,
      })

    if (!row) {
      throw createError({ statusCode: 500, message: '建立自訂網域失敗' })
    }

    const rc = useRuntimeConfig(event)
    const cfToken = String(rc.cloudflareApiToken || '').trim()
    const cfZone = String(rc.cloudflareZoneId || '').trim()
    let cloudflareSyncError: string | undefined
    let cfLinked = false

    if (cfToken && cfZone) {
      const saasFallback = String(rc.public?.saasCnameTarget || '').trim()
      if (!saasFallback) {
        console.warn(
          '[admin/custom-domains] 未設定 NUXT_PUBLIC_SAAS_CNAME_TARGET，Custom Hostname 回源 SNI 可能為客戶網域，來源易出現 525；請設為與 Fallback Origin 相同並考慮 PATCH custom_origin_server。',
        )
      }
      const cf = await cloudflareCreateCustomHostname(cfToken, cfZone, row.hostname, {
        customOriginServer: saasFallback || undefined,
      })
      if (cf.ok) {
        await db
          .update(schema.tenantCustomDomains)
          .set({ cfCustomHostnameId: cf.id })
          .where(eq(schema.tenantCustomDomains.id, row.id))
        cfLinked = true
      } else {
        cloudflareSyncError = cf.message
        console.error(
          `[admin/custom-domains POST] Cloudflare custom hostname 失敗: ${cf.message}`,
        )
      }
    }

    return {
      id: row.id,
      hostname: row.hostname,
      verifiedAt: null,
      verificationToken,
      cfLinked,
      ...(cloudflareSyncError ? { cloudflareSyncError } : {}),
    }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此網域已被其他商店使用' })
    }
    console.error('[admin/custom-domains POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '建立自訂網域失敗' })
  }
})
