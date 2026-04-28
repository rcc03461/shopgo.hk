import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../../database/schema'
import { getDb } from '../../../../utils/db'
import { txtRecordsIncludeToken } from '../../../../utils/customDomainDnsVerify'
import { requireTenantSession } from '../../../../utils/requireTenantSession'

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
      id: schema.tenantCustomDomains.id,
      hostname: schema.tenantCustomDomains.hostname,
      verificationToken: schema.tenantCustomDomains.verificationToken,
      verifiedAt: schema.tenantCustomDomains.verifiedAt,
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

  if (row.verifiedAt != null) {
    return { ok: true, alreadyVerified: true }
  }

  const dnsOk = await txtRecordsIncludeToken(
    row.hostname,
    row.verificationToken,
  )
  if (!dnsOk) {
    throw createError({
      statusCode: 400,
      message: '找不到驗證用 TXT 記錄，請確認 DNS 已生效',
    })
  }

  const [updated] = await db
    .update(schema.tenantCustomDomains)
    .set({ verifiedAt: new Date() })
    .where(
      and(
        eq(schema.tenantCustomDomains.id, id),
        eq(schema.tenantCustomDomains.tenantId, session.tenantId),
      ),
    )
    .returning({ verifiedAt: schema.tenantCustomDomains.verifiedAt })

  if (!updated?.verifiedAt) {
    throw createError({ statusCode: 500, message: '更新驗證狀態失敗' })
  }

  return {
    ok: true,
    verifiedAt: updated.verifiedAt.toISOString(),
  }
})
