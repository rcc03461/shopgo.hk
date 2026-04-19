import type { H3Event } from 'h3'
import { deleteCookie, getRequestHeader, setCookie } from 'h3'
import { AUTH_COOKIE } from './authJwt'

const SESSION_MAX_AGE = 60 * 60 * 24 * 7

/**
 * 在 oshop.com.hk / *.oshop.com.hk 使用 Domain=.root，讓子網域共用 Session。
 * localhost 不設定 domain（僅 host-only）。
 */
function resolveSessionCookieDomain(event: H3Event): string | undefined {
  const config = useRuntimeConfig(event)
  const root = (config.public?.tenantRootDomain as string | undefined)
    ?.trim()
    .toLowerCase()
  if (!root) return undefined

  const raw = getRequestHeader(event, 'host') || ''
  const host = raw.split(':')[0]?.toLowerCase() || ''
  if (!host || host === 'localhost' || host === '127.0.0.1') return undefined

  if (host === root || host.endsWith(`.${root}`)) {
    return `.${root}`
  }
  return undefined
}

export function setAuthSessionCookie(event: H3Event, token: string) {
  const domain = resolveSessionCookieDomain(event)
  const secure = process.env.NODE_ENV === 'production'

  setCookie(event, AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: SESSION_MAX_AGE,
    ...(domain ? { domain } : {}),
  })
}

export function clearAuthSessionCookie(event: H3Event) {
  const domain = resolveSessionCookieDomain(event)
  deleteCookie(event, AUTH_COOKIE, {
    path: '/',
    ...(domain ? { domain } : {}),
  })
}
