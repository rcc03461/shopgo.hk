import { and, asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'
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
  const search =
    typeof q.q === 'string' && q.q.trim().length > 0 ? q.q.trim() : ''

  const db = getDb(event)
  const tenantId = session.tenantId

  const whereClause = search
    ? and(
        eq(schema.products.tenantId, tenantId),
        or(
          ilike(schema.products.title, `%${search}%`),
          ilike(schema.products.slug, `%${search}%`),
        ),
      )
    : eq(schema.products.tenantId, tenantId)

  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.products)
    .where(whereClause)

  const total = Number(totalRow?.total ?? 0)
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id: schema.products.id,
      slug: schema.products.slug,
      title: schema.products.title,
      basePrice: schema.products.basePrice,
      updatedAt: schema.products.updatedAt,
    })
    .from(schema.products)
    .where(whereClause)
    .orderBy(desc(schema.products.updatedAt), asc(schema.products.id))
    .limit(pageSize)
    .offset(offset)

  const ids = rows.map((r) => r.id)
  const variantCountMap = new Map<string, number>()
  if (ids.length > 0) {
    const cnt = await db
      .select({
        productId: schema.productVariants.productId,
        c: count(),
      })
      .from(schema.productVariants)
      .where(inArray(schema.productVariants.productId, ids))
      .groupBy(schema.productVariants.productId)
    for (const row of cnt) {
      variantCountMap.set(row.productId, Number(row.c))
    }
  }

  return {
    items: rows.map((r) => ({
      ...r,
      variantCount: variantCountMap.get(r.id) ?? 0,
    })),
    page,
    pageSize,
    total,
  }
})
