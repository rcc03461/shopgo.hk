/**
 * 保護 /admin/*：僅租戶子網域可進入，且須登入、JWT 內 shopSlug 須與 Host 一致。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return

  const tenantSlug = useState<string | null>('oshop-tenant-slug')
  const config = useRuntimeConfig()
  const root = String(config.public.tenantRootDomain || 'shopgo.hk')
  const isAdminPublicEntry =
    to.path === '/admin/login' || to.path === '/admin/register'

  if (!tenantSlug.value) {
    if (isAdminPublicEntry) return
    const url = useRequestURL()
    const port = url.port ? `:${url.port}` : ''
    const mainOrigin = `${url.protocol}//${root}${port}`
    return navigateTo(mainOrigin + '/', { external: true })
  }

  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const me = await $fetch<{ user: { shopSlug: string } | null }>('/api/auth/me', {
    headers,
    credentials: import.meta.client ? 'include' : 'same-origin',
  })

  if (!me.user) {
    // 登入/註冊頁允許匿名訪問，避免重複導回自己造成循環
    if (isAdminPublicEntry) return
    return navigateTo(`/admin/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  // 已登入就不應停留在登入/註冊頁
  if (isAdminPublicEntry) {
    return navigateTo('/admin/dashboard')
  }

  if (me.user.shopSlug !== tenantSlug.value) {
    return navigateTo('/admin/login')
  }
})
