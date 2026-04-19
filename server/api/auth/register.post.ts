import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { isError } from 'h3'
import * as schema from '../../database/schema'
import { signSessionToken } from '../../utils/authJwt'
import { setAuthSessionCookie } from '../../utils/authCookie'
import {
  summarizeDbErrorForLog,
  throwIfHandledRegisterDbError,
} from '../../utils/dbErrors'
import { getDb } from '../../utils/db'
import { registerBodySchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = registerBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const { shopSlug, email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()
  const db = getDb(event)

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const result = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(schema.tenants)
        .values({ shopSlug })
        .returning()

      if (!tenant) {
        throw createError({ statusCode: 500, message: '建立租戶失敗' })
      }

      const [user] = await tx
        .insert(schema.users)
        .values({
          tenantId: tenant.id,
          email: normalizedEmail,
          passwordHash,
        })
        .returning()

      if (!user) {
        throw createError({ statusCode: 500, message: '建立帳號失敗' })
      }

      return { tenant, user }
    })

    const token = await signSessionToken(event, {
      sub: result.user.id,
      email: normalizedEmail,
      tenantId: result.tenant.id,
      shopSlug: result.tenant.shopSlug,
    })

    setAuthSessionCookie(event, token)

    return {
      ok: true as const,
      tenant: { shopSlug: result.tenant.shopSlug },
      user: { email: normalizedEmail },
    }
  } catch (e: unknown) {
    if (!isError(e)) {
      console.error('[auth/register]', summarizeDbErrorForLog(e))
    }
    await throwIfHandledRegisterDbError(e, {
      shopSlug,
      isSlugTaken: async () => {
        const slugTaken = await db
          .select({ id: schema.tenants.id })
          .from(schema.tenants)
          .where(eq(schema.tenants.shopSlug, shopSlug))
          .limit(1)
        return slugTaken.length > 0
      },
    })
  }
})
