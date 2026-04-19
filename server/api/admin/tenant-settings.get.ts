import { and, eq, inArray, isNull } from 'drizzle-orm'
import { createError } from 'h3'
import * as schema from '../../database/schema'
import { getDb } from '../../utils/db'
import { requireTenantSession } from '../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const db = getDb(event)

  const [tenant] = await db
    .select({
      shopSlug: schema.tenants.shopSlug,
      settings: schema.tenants.settings,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, session.tenantId))
    .limit(1)

  if (!tenant) {
    throw createError({ statusCode: 404, message: '找不到租戶' })
  }

  const raw = tenant.settings as Record<string, unknown>
  const logoId = typeof raw.logoAttachmentId === 'string' ? raw.logoAttachmentId : null
  const favId =
    typeof raw.faviconAttachmentId === 'string' ? raw.faviconAttachmentId : null

  const ids = [logoId, favId].filter((x): x is string => !!x)
  let logo: { id: string; publicUrl: string | null; filename: string } | null = null
  let favicon: { id: string; publicUrl: string | null; filename: string } | null = null

  if (ids.length) {
    const rows = await db
      .select({
        id: schema.attachments.id,
        publicUrl: schema.attachments.publicUrl,
        filename: schema.attachments.filename,
      })
      .from(schema.attachments)
      .where(
        and(
          eq(schema.attachments.tenantId, session.tenantId),
          isNull(schema.attachments.deletedAt),
          inArray(schema.attachments.id, ids),
        ),
      )

    const byId = new Map(rows.map((r) => [r.id, r]))
    if (logoId) {
      const r = byId.get(logoId)
      if (r) logo = r
    }
    if (favId) {
      const r = byId.get(favId)
      if (r) favicon = r
    }
  }

  return {
    shopSlug: tenant.shopSlug,
    settings: tenant.settings,
    previews: { logo, favicon },
  }
})
