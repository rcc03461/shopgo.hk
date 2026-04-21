import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(q.pageSize) || DEFAULT_PAGE_SIZE),
  )
  const search = typeof q.q === 'string' ? q.q.trim() : ''
  const status = typeof q.status === 'string' ? q.status.trim() : ''

  const filters = [eq(schema.pages.tenantId, session.tenantId)]
  if (search) {
    filters.push(
      or(
        ilike(schema.pages.title, `%${search}%`),
        ilike(schema.pages.slug, `%${search}%`),
      )!,
    )
  }
  if (status && ['draft', 'published', 'archived'].includes(status)) {
    filters.push(eq(schema.pages.status, status))
  }
  const whereClause = and(...filters)

  const db = getDb(event)
  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.pages)
    .where(whereClause)
  const total = Number(totalRow?.total ?? 0)

  const items = await db
    .select({
      id: schema.pages.id,
      title: schema.pages.title,
      slug: schema.pages.slug,
      status: schema.pages.status,
      updatedAt: schema.pages.updatedAt,
      publishedAt: schema.pages.publishedAt,
    })
    .from(schema.pages)
    .where(whereClause)
    .orderBy(
      desc(schema.pages.updatedAt),
      asc(schema.pages.title),
      asc(schema.pages.id),
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  return {
    items,
    page,
    pageSize,
    total,
  }
})
