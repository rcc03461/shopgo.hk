import { createError } from 'h3'
import { SignJWT, jwtVerify } from 'jose'
import type { H3Event } from 'h3'

export const AUTH_COOKIE = 'oshop_session'

export type SessionPayload = {
  sub: string
  email: string
  tenantId: string
  shopSlug: string
}

function getSecret(event: H3Event) {
  const fromConfig = useRuntimeConfig(event).jwtSecret as string | undefined
  const secret =
    fromConfig?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.NUXT_JWT_SECRET?.trim() ||
    ''
  if (!secret) {
    throw createError({
      statusCode: 500,
      message:
        '伺服器未設定 JWT_SECRET：請在 .env 設定後重新啟動；正式環境亦可使用 NUXT_JWT_SECRET',
    })
  }
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(
  event: H3Event,
  payload: SessionPayload,
): Promise<string> {
  const secret = getSecret(event)
  return new SignJWT({
    email: payload.email,
    tenantId: payload.tenantId,
    shopSlug: payload.shopSlug,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifySessionToken(
  event: H3Event,
  token: string,
): Promise<SessionPayload> {
  const secret = getSecret(event)
  const { payload } = await jwtVerify(token, secret)
  const sub = typeof payload.sub === 'string' ? payload.sub : ''
  const email = typeof payload.email === 'string' ? payload.email : ''
  const tenantId = typeof payload.tenantId === 'string' ? payload.tenantId : ''
  const shopSlug = typeof payload.shopSlug === 'string' ? payload.shopSlug : ''
  if (!sub || !email || !tenantId || !shopSlug) {
    throw createError({ statusCode: 401, message: '登入狀態無效' })
  }
  return { sub, email, tenantId, shopSlug }
}
