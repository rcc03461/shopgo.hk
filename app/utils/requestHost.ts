/**
 * 供 route middleware 取得目前請求的 Host（含埠）。
 * 客戶端 hydration / 同頁導向時 useRequestHeaders().host 常為空，需 fallback 到 window.location。
 */
export function getRequestHostForMiddleware(): string {
  if (import.meta.client && typeof window !== 'undefined') {
    return window.location.host || ''
  }
  const fromHeader = useRequestHeaders(['host']).host
  if (fromHeader) return fromHeader
  try {
    return useRequestURL().host || ''
  } catch {
    return ''
  }
}
