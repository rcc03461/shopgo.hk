/**
 * 組合租戶子站完整 origin（含通訊協定與埠，與目前請求／瀏覽器一致）
 */
export function useTenantWebOrigin(shopSlug: string): string {
  const config = useRuntimeConfig()
  const root = String(config.public.tenantRootDomain || 'oshop.com.hk')
    .trim()
    .toLowerCase()
  const slug = shopSlug.trim().toLowerCase()

  if (import.meta.server) {
    const url = useRequestURL()
    const port = url.port ? `:${url.port}` : ''
    return `${url.protocol}//${slug}.${root}${port}`
  }

  const port = window.location.port ? `:${window.location.port}` : ''
  return `${window.location.protocol}//${slug}.${root}${port}`
}

/** 登入／註冊後預設進入的後台網址 */
export function useTenantAdminEntryUrl(shopSlug: string): string {
  const path = useRuntimeConfig().public.adminDefaultPath as string
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${useTenantWebOrigin(shopSlug).replace(/\/$/, '')}${normalized}`
}
