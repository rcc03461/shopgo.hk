import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('頁面 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!parsed.success) {
    throw createError({ statusCode: 404, message: parsed.error.issues[0]?.message })
  }
  const pageId = parsed.data

  const db = getDb(event)
  const [row] = await db
    .select()
    .from(schema.pages)
    .where(and(eq(schema.pages.id, pageId), eq(schema.pages.tenantId, session.tenantId)))
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, message: '找不到頁面' })
  }
  return { page: row }
})
