import { and, count, desc, eq, isNull } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const DEFAULT_PAGE_SIZE = 24
const MAX_PAGE_SIZE = 100

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
  )
  const offset = (page - 1) * pageSize

  const db = getDb(event)
  const whereClause = and(
    eq(schema.attachments.tenantId, session.tenantId),
    isNull(schema.attachments.deletedAt),
  )

  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.attachments)
    .where(whereClause)

  const items = await db
    .select({
      id: schema.attachments.id,
      type: schema.attachments.type,
      mimetype: schema.attachments.mimetype,
      filename: schema.attachments.filename,
      extension: schema.attachments.extension,
      size: schema.attachments.size,
      publicUrl: schema.attachments.publicUrl,
      createdAt: schema.attachments.createdAt,
      updatedAt: schema.attachments.updatedAt,
    })
    .from(schema.attachments)
    .where(whereClause)
    .orderBy(desc(schema.attachments.createdAt), desc(schema.attachments.id))
    .limit(pageSize)
    .offset(offset)

  const total = Number(totalRow?.total ?? 0)
  const hasMore = page * pageSize < total

  return {
    items,
    page,
    pageSize,
    total,
    hasMore,
  }
})
