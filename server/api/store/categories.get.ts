import { and, asc, eq } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { getDb } from '../../utils/db'
import { requireStoreTenant } from '../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const db = getDb(event)

  const rows = await db
    .select({
      id: schema.categories.id,
      slug: schema.categories.slug,
      name: schema.categories.name,
      sortOrder: schema.categories.sortOrder,
    })
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.tenantId, tenant.id),
        eq(schema.categories.status, 'active'),
      ),
    )
    .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.id))

  return { categories: rows }
})
