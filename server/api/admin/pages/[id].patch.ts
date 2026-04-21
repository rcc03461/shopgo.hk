import { and, eq } from 'drizzle-orm'
import { createError, isError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { adminPatchPageBodySchema } from '../../../utils/pageSchemas'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const uuidParam = z.string().uuid('頁面 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = uuidParam.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({ statusCode: 404, message: idParsed.error.issues[0]?.message })
  }
  const pageId = idParsed.data

  const parsed = adminPatchPageBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }
  const patch = parsed.data
  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, message: '沒有要更新的欄位' })
  }

  const db = getDb(event)
  try {
    const [existing] = await db
      .select({
        id: schema.pages.id,
        status: schema.pages.status,
        publishedAt: schema.pages.publishedAt,
      })
      .from(schema.pages)
      .where(and(eq(schema.pages.id, pageId), eq(schema.pages.tenantId, session.tenantId)))
      .limit(1)

    if (!existing) {
      throw createError({ statusCode: 404, message: '找不到頁面' })
    }

    const next: Partial<typeof schema.pages.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (patch.title !== undefined) next.title = patch.title
    if (patch.slug !== undefined) next.slug = patch.slug
    if (patch.excerpt !== undefined) next.excerpt = patch.excerpt
    if (patch.contentMarkdown !== undefined)
      next.contentMarkdown = patch.contentMarkdown
    if (patch.seoTitle !== undefined) next.seoTitle = patch.seoTitle
    if (patch.seoDescription !== undefined) next.seoDescription = patch.seoDescription
    if (patch.status !== undefined) {
      next.status = patch.status
      if (
        patch.status === 'published' &&
        existing.status !== 'published' &&
        !existing.publishedAt
      ) {
        next.publishedAt = new Date()
      }
    }

    const [updated] = await db
      .update(schema.pages)
      .set(next)
      .where(and(eq(schema.pages.id, pageId), eq(schema.pages.tenantId, session.tenantId)))
      .returning()

    if (!updated) {
      throw createError({ statusCode: 404, message: '找不到頁面' })
    }
    return { page: updated }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此網址代號已被使用' })
    }
    console.error('[admin/pages PATCH]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '更新頁面失敗' })
  }
})
