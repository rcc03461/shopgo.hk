import { createError, isError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { getPgSqlState, summarizeDbErrorForLog } from '../../../utils/dbErrors'
import { adminCreatePageBodySchema } from '../../../utils/pageSchemas'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const parsed = adminCreatePageBodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }

  const data = parsed.data
  const db = getDb(event)
  try {
    const [row] = await db
      .insert(schema.pages)
      .values({
        tenantId: session.tenantId,
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt ?? null,
        contentMarkdown: data.contentMarkdown ?? '',
        status: data.status,
        publishedAt: data.status === 'published' ? new Date() : null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        updatedAt: new Date(),
      })
      .returning()

    if (!row) {
      throw createError({ statusCode: 500, message: '建立頁面失敗' })
    }
    return { page: row }
  } catch (e: unknown) {
    if (isError(e)) throw e
    if (getPgSqlState(e) === '23505') {
      throw createError({ statusCode: 409, message: '此網址代號已被使用' })
    }
    console.error('[admin/pages POST]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '建立頁面失敗' })
  }
})
