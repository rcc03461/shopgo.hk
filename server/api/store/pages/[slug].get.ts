import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { renderPageMarkdownToSafeHtml } from '../../../utils/pageContentRender'
import { requireStoreTenant } from '../../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const slug = String(getRouterParam(event, 'slug') || '').trim()
  if (!slug) {
    throw createError({ statusCode: 404, message: '找不到頁面' })
  }

  const db = getDb(event)
  const [row] = await db
    .select({
      title: schema.pages.title,
      slug: schema.pages.slug,
      excerpt: schema.pages.excerpt,
      contentMarkdown: schema.pages.contentMarkdown,
      seoTitle: schema.pages.seoTitle,
      seoDescription: schema.pages.seoDescription,
      publishedAt: schema.pages.publishedAt,
    })
    .from(schema.pages)
    .where(
      and(
        eq(schema.pages.tenantId, tenant.id),
        eq(schema.pages.slug, slug),
        eq(schema.pages.status, 'published'),
      ),
    )
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, message: '找不到頁面' })
  }

  return {
    page: {
      ...row,
      contentHtml: renderPageMarkdownToSafeHtml(row.contentMarkdown || ''),
    },
  }
})
