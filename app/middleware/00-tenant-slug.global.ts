import { parseTenantSlugFromHost } from '~/utils/tenantHost'
import { getRequestHostForMiddleware } from '~/utils/requestHost'

/**
 * 依 Host 解析租戶 slug，供頁面與 admin middleware 使用。
 */
export default defineNuxtRouteMiddleware(() => {
  const config = useRuntimeConfig()
  const root = String(config.public.tenantRootDomain || 'oshop.com.hk')
  const host = getRequestHostForMiddleware()
  const slug = parseTenantSlugFromHost(host, root)

  const state = useState<string | null>('oshop-tenant-slug', () => null)
  state.value = slug
})
