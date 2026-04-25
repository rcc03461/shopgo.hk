import { parseTenantSlugFromHost } from '~/utils/tenantHost'
import { getRequestHostForMiddleware } from '~/utils/requestHost'

/**
 * 依 Host 解析租戶 slug，供頁面與 admin middleware 使用。
 */
export default defineNuxtRouteMiddleware(() => {
  const state = useState<string | null>('oshop-tenant-slug', () => null)
  if (import.meta.client) {
    const nuxtApp = useNuxtApp()
    // SSR 頁面 hydration 期間沿用注水狀態；CSR-only route 沒有 SSR state，仍須從 window.location 解析。
    if (nuxtApp.isHydrating && nuxtApp.payload.serverRendered) return
  }

  const config = useRuntimeConfig()
  const root = String(config.public.tenantRootDomain || 'oshop.com.hk')
  const host = getRequestHostForMiddleware()
  const slug = parseTenantSlugFromHost(host, root)
  state.value = slug
})
