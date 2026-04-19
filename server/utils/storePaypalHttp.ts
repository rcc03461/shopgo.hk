import { createError } from 'h3'

type PaypalEnv = 'sandbox' | 'live'

export function paypalApiBase(env: PaypalEnv): string {
  return env === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

export async function paypalFetchAccessToken(
  env: PaypalEnv,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const tokenUrl = `${paypalApiBase(env)}/v1/oauth2/token`
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const json = (await res.json()) as { access_token?: string; error_description?: string }
  if (!res.ok || !json.access_token) {
    throw createError({
      statusCode: 502,
      message: json.error_description || 'PayPal 授權失敗',
    })
  }
  return json.access_token
}

export async function paypalCreateOrderJson(
  env: PaypalEnv,
  accessToken: string,
  body: unknown,
): Promise<{ id: string; links?: { href: string; rel: string }[] }> {
  const res = await fetch(`${paypalApiBase(env)}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as {
    id?: string
    links?: { href: string; rel: string }[]
    message?: string
  }
  if (!res.ok || !json.id) {
    throw createError({
      statusCode: 502,
      message: json.message || 'PayPal 建立訂單失敗',
    })
  }
  return { id: json.id, links: json.links }
}

export async function paypalCaptureOrder(
  env: PaypalEnv,
  accessToken: string,
  paypalOrderId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${paypalApiBase(env)}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    const msg =
      typeof (json as { message?: string }).message === 'string'
        ? (json as { message: string }).message
        : 'PayPal 請款失敗'
    throw createError({ statusCode: 502, message: msg })
  }
  return json
}
