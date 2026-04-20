import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  min,
  or,
} from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireStoreTenant } from '../../../utils/storeTenant'

const DEFAULT_PAGE_SIZE = 24
const MAX_PAGE_SIZE = 48

const categoryIdSchema = z.string().uuid('分類 id 格式不正確')

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const db = getDb(event)
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page) || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(q.pageSize) || DEFAULT_PAGE_SIZE),
  )
  const search =
    typeof q.q === 'string' && q.q.trim().length > 0 ? q.q.trim() : ''

  let categoryId: string | undefined
  if (typeof q.categoryId === 'string' && q.categoryId.length > 0) {
    const parsed = categoryIdSchema.safeParse(q.categoryId)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: parsed.error.issues[0]?.message ?? '分類參數不正確',
      })
    }
    const [cat] = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.id, parsed.data),
          eq(schema.categories.tenantId, tenant.id),
          eq(schema.categories.status, 'active'),
        ),
      )
      .limit(1)
    if (!cat) {
      throw createError({ statusCode: 404, message: '找不到分類' })
    }
    categoryId = parsed.data
  }

  const tenantId = tenant.id

  const searchClause = search
    ? or(
        ilike(schema.products.title, `%${search}%`),
        ilike(schema.products.slug, `%${search}%`),
      )
    : undefined

  const categoryClause = categoryId
    ? exists(
        db
          .select({ n: sql`1` })
          .from(schema.productCategories)
          .where(
            and(
              eq(schema.productCategories.productId, schema.products.id),
              eq(schema.productCategories.categoryId, categoryId),
            ),
          ),
      )
    : undefined

  const conditions = [eq(schema.products.tenantId, tenantId)]
  if (searchClause) conditions.push(searchClause)
  if (categoryClause) conditions.push(categoryClause)
  const whereClause = and(...conditions)

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
      coverAttachmentId: schema.products.coverAttachmentId,
      updatedAt: schema.products.updatedAt,
    })
    .from(schema.products)
    .where(whereClause)
    .orderBy(desc(schema.products.updatedAt), asc(schema.products.id))
    .limit(pageSize)
    .offset(offset)

  const ids = rows.map((r) => r.id)
  const variantMinByProduct = new Map<string, string>()
  if (ids.length > 0) {
    const mins = await db
      .select({
        productId: schema.productVariants.productId,
        minPrice: min(schema.productVariants.price).as('min_price'),
      })
      .from(schema.productVariants)
      .where(inArray(schema.productVariants.productId, ids))
      .groupBy(schema.productVariants.productId)
    for (const m of mins) {
      variantMinByProduct.set(m.productId, String(m.minPrice))
    }
  }

  const coverIds = [
    ...new Set(
      rows
        .map((r) => r.coverAttachmentId)
        .filter((x): x is string => typeof x === 'string' && x.length > 0),
    ),
  ]
  const coverUrlById = new Map<string, string | null>()
  if (coverIds.length > 0) {
    const covers = await db
      .select({
        id: schema.attachments.id,
        publicUrl: schema.attachments.publicUrl,
      })
      .from(schema.attachments)
      .where(
        and(
          eq(schema.attachments.tenantId, tenantId),
          inArray(schema.attachments.id, coverIds),
          isNull(schema.attachments.deletedAt),
        ),
      )
    for (const c of covers) {
      coverUrlById.set(c.id, c.publicUrl)
    }
  }

  return {
    items: rows.map((r) => {
      const variantFloor = variantMinByProduct.get(r.id)
      const displayPrice = variantFloor ?? String(r.basePrice)
      const coverUrl = r.coverAttachmentId
        ? (coverUrlById.get(r.coverAttachmentId) ?? null)
        : null
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        basePrice: String(r.basePrice),
        originalPrice: r.originalPrice ? String(r.originalPrice) : null,
        displayPrice,
        hasVariants: Boolean(variantFloor),
        coverUrl,
        updatedAt: r.updatedAt,
      }
    }),
    page,
    pageSize,
    total,
  }
})
