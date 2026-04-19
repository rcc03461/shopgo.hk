import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { signSessionToken } from '../../utils/authJwt'
import { setAuthSessionCookie } from '../../utils/authCookie'
import { getDb } from '../../utils/db'
import { loginBodySchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const { email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()
  const db = getDb(event)

  const rows = await db
    .select({
      id: schema.users.id,
      passwordHash: schema.users.passwordHash,
      tenantId: schema.users.tenantId,
      shopSlug: schema.tenants.shopSlug,
    })
    .from(schema.users)
    .innerJoin(schema.tenants, eq(schema.users.tenantId, schema.tenants.id))
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1)

  const row = rows[0]
  if (!row) {
    throw createError({ statusCode: 401, message: '帳號或密碼不正確' })
  }

  const match = await bcrypt.compare(password, row.passwordHash)
  if (!match) {
    throw createError({ statusCode: 401, message: '帳號或密碼不正確' })
  }

  const token = await signSessionToken(event, {
    sub: row.id,
    email: normalizedEmail,
    tenantId: row.tenantId,
    shopSlug: row.shopSlug,
  })

  setAuthSessionCookie(event, token)

  return {
    ok: true as const,
    user: { email: normalizedEmail },
    tenant: { shopSlug: row.shopSlug },
  }
})
