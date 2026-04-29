/** Cloudflare for SaaS：`POST /zones/:zone_id/custom_hostnames` */

type CfApiEnvelope<T> = {
  success: boolean
  errors: Array<{ code: number; message: string }>
  messages: string[]
  result: T | null
}

(errors: CfApiEnvelope<unknown>['errors']): string {
  if (!errors?.length) return '未知錯誤'
  return errors.map((e) => `[${e.code}] ${e.message}`).join('; ')
}

/**
 * 建立 Custom Hostname（DV + TXT DCV；租戶 DNS 仍以 CF 詳情為準）。
 *
 * **customOriginServer**：與 Fallback Origin／`NUXT_PUBLIC_SAAS_CNAME_TARGET` **相同主機名**（例如 shopgo.com.hk）。
 * 若不設定，CF 對預設回源會對 **來源送出 SNI = 租戶網域**，Caddy 僅持有 *.shopgo 憑證時會 TLS 握手失敗（錯誤 **525**）。
 *
 * @see https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/start/advanced-settings/custom-origin/
 * @see https://developers.cloudflare.com/api/resources/custom_hostnames/methods/create/
 */
export async function cloudflareCreateCustomHostname(
  apiToken: string,
  zoneId: string,
  hostname: string,
  options?: { customOriginServer?: string },
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`
  const body: Record<string, unknown> = {
    hostname,
    ssl: {
      method: 'txt' as const,
      type: 'dv' as const,
    },
  }
  const origin = options?.customOriginServer?.trim()
  if (origin) {
    body.custom_origin_server = origin
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as CfApiEnvelope<{ id?: string; hostname?: string }>
  if (!res.ok || !json.success || !json.result?.id) {
    return {
      ok: false,
      message: summarizeCfErrors(json.errors) || `${res.status} ${res.statusText}`,
    }
  }

  return { ok: true, id: json.result.id }
}

/**
 * 更新既有 Custom Hostname（例如在預設回源下補 `custom_origin_server`，消除 525）。
 *
 * @see https://developers.cloudflare.com/api/resources/custom_hostnames/methods/edit/
 */
export async function cloudflarePatchCustomHostname(
  apiToken: string,
  zoneId: string,
  customHostnameId: string,
  patch: { customOriginServer: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const origin = patch.customOriginServer.trim()
  if (!origin) {
    return { ok: false, message: 'custom_origin_server 不可為空' }
  }

  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${customHostnameId}`
  const body = {
    custom_origin_server: origin,
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as CfApiEnvelope<unknown>
  if (!res.ok || !json.success) {
    return {
      ok: false,
      message: summarizeCfErrors(json.errors) || `${res.status} ${res.statusText}`,
    }
  }

  return { ok: true }
}

/**
 * 刪除 Custom Hostname；若已不存在則視為成功（idempotent）。
 */
export async function cloudflareDeleteCustomHostname(
  apiToken: string,
  zoneId: string,
  customHostnameId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${customHostnameId}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  })

  if (res.status === 404) {
    return { ok: true }
  }

  const json = (await res.json()) as CfApiEnvelope<unknown>
  if (!res.ok || !json.success) {
    return {
      ok: false,
      message: summarizeCfErrors(json.errors) || `${res.status} ${res.statusText}`,
    }
  }

  return { ok: true }
}
