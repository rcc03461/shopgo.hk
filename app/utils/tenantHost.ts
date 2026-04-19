/**
 * 從 HTTP Host 解析租戶子網域 slug（單層：{slug}.rootDomain）
 */
export function parseTenantSlugFromHost(
  hostHeader: string,
  rootDomain: string,
): string | null {
  const h = hostHeader.split(':')[0]?.toLowerCase().trim() ?? ''
  const root = rootDomain.toLowerCase().trim()
  if (!h || !root) return null
  if (h === 'localhost' || h === '127.0.0.1') return null
  if (h === root || h === `www.${root}`) return null
  if (!h.endsWith(`.${root}`)) return null
  const prefix = h.slice(0, -(root.length + 1))
  if (!prefix || prefix.includes('.')) return null
  return prefix
}
