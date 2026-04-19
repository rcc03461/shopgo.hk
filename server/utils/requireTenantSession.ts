import { getCookie, getRequestURL, createError } from 'h3'
import type { H3Event } from 'h3'
import { parseTenantSlugFromHost } from '../../app/utils/tenantHost'
import { AUTH_COOKIE, verifySessionToken, type SessionPayload } from './authJwt'

/**
 * Admin API：驗證登入 Cookie，並確認 Host 子網域與 JWT shopSlug 一致。
 */
export async function requireTenantSession(event: H3Event): Promise<SessionPayload> {
  const token = getCookie(event, AUTH_COOKIE)
  if (!token) {
    throw createError({ statusCode: 401, message: '未登入' })
  }

  const session = await verifySessionToken(event, token)
  const config = useRuntimeConfig(event)
  const root = String(config.public.tenantRootDomain || 'oshop.com.hk')
  const host = getRequestURL(event).host
  const slug = parseTenantSlugFromHost(host, root)

  if (!slug || slug !== session.shopSlug) {
    throw createError({ statusCode: 403, message: '商店網域與登入狀態不符' })
  }

  return session
}
