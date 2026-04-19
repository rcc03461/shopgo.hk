import { and, eq, inArray, isNull } from 'drizzle-orm'
import { createError, isError } from 'h3'
import * as schema from '../../database/schema'
import { getDb } from '../../utils/db'
import { summarizeDbErrorForLog } from '../../utils/dbErrors'
import { requireTenantSession } from '../../utils/requireTenantSession'
import {
  adminTenantSettingsPatchBodySchema,
  tenantStoredSettingsSchema,
} from '../../utils/tenantSettingsSchemas'

async function assertAttachmentsOwned(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  ids: (string | null | undefined)[],
) {
  const needed = [...new Set(ids.filter((x): x is string => typeof x === 'string'))]
  if (!needed.length) return

  const rows = await db
    .select({ id: schema.attachments.id })
    .from(schema.attachments)
    .where(
      and(
        eq(schema.attachments.tenantId, tenantId),
        isNull(schema.attachments.deletedAt),
        inArray(schema.attachments.id, needed),
      ),
    )

  if (rows.length !== needed.length) {
    throw createError({
      statusCode: 400,
      message: 'Logo／圖示附件不存在、已刪除或不屬於此商店',
    })
  }
}

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const db = getDb(event)
  const body = await readBody(event)
  const wrapped = adminTenantSettingsPatchBodySchema.safeParse(body)
  if (!wrapped.success) {
    const msg = wrapped.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const parsed = tenantStoredSettingsSchema.safeParse(wrapped.data.settings)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '設定內容驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const next = parsed.data
  await assertAttachmentsOwned(db, session.tenantId, [
    next.logoAttachmentId,
    next.faviconAttachmentId,
  ])

  try {
    const [updated] = await db
      .update(schema.tenants)
      .set({ settings: next })
      .where(eq(schema.tenants.id, session.tenantId))
      .returning({
        shopSlug: schema.tenants.shopSlug,
        settings: schema.tenants.settings,
      })

    if (!updated) {
      throw createError({ statusCode: 404, message: '找不到租戶' })
    }

    return { ok: true as const, shopSlug: updated.shopSlug, settings: updated.settings }
  } catch (e: unknown) {
    if (isError(e)) throw e
    console.error('[admin/tenant-settings PATCH]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '儲存設定失敗' })
  }
})
