import { desc, eq } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const db = getDb(event)

  const rows = await db
    .select({
      id: schema.tenantCustomDomains.id,
      hostname: schema.tenantCustomDomains.hostname,
      cfCustomHostnameId: schema.tenantCustomDomains.cfCustomHostnameId,
      verifiedAt: schema.tenantCustomDomains.verifiedAt,
      createdAt: schema.tenantCustomDomains.createdAt,
    })
    .from(schema.tenantCustomDomains)
    .where(eq(schema.tenantCustomDomains.tenantId, session.tenantId))
    .orderBy(desc(schema.tenantCustomDomains.createdAt))

  return {
    items: rows.map((r) => ({
      id: r.id,
      hostname: r.hostname,
      cfLinked: r.cfCustomHostnameId != null,
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
  }
})
