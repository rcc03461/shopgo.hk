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
      originalPrice: schema.products.originalPrice,
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

  const categoryNamesByProduct = new Map<string, string[]>()
  if (ids.length > 0) {
    const catRows = await db
      .select({
        productId: schema.productCategories.productId,
        name: schema.categories.name,
      })
      .from(schema.productCategories)
      .innerJoin(
        schema.categories,
        eq(schema.productCategories.categoryId, schema.categories.id),
      )
      .where(inArray(schema.productCategories.productId, ids))
      .orderBy(
        asc(schema.productCategories.sortOrder),
        asc(schema.productCategories.id),
      )
    for (const r of catRows) {
      const list = categoryNamesByProduct.get(r.productId) ?? []
      list.push(r.name)
      categoryNamesByProduct.set(r.productId, list)
    }
  }

  function formatCategorySummary(names: string[]) {
    if (names.length === 0) return '—'
    const head = names.slice(0, 4)
    const rest = names.length - head.length
    return rest > 0 ? `${head.join('、')} 等 ${names.length} 個` : head.join('、')
  }

  return {
    items: rows.map((r) => {
      const catNames = categoryNamesByProduct.get(r.id) ?? []
      return {
        ...r,
        basePrice: String(r.basePrice),
        originalPrice: r.originalPrice ? String(r.originalPrice) : null,
        variantCount: variantCountMap.get(r.id) ?? 0,
        categoryCount: catNames.length,
        categorySummary: formatCategorySummary(catNames),
      }
    }),
    page,
    pageSize,
    total,
  }
})
