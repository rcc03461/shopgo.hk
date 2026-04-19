import { createError } from 'h3'

function stripeErrorMessage(json: unknown): string {
  if (!json || typeof json !== 'object') return 'Stripe 請求失敗'
  const err = (json as { error?: { message?: string } }).error
  return typeof err?.message === 'string' ? err.message : 'Stripe 請求失敗'
}

export async function stripePostForm(
  secretKey: string,
  path: string,
  flatParams: Record<string, string>,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(flatParams)
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    throw createError({ statusCode: 502, message: stripeErrorMessage(json) })
  }
  return json
}

export async function stripeGetJson(
  secretKey: string,
  path: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    throw createError({ statusCode: 502, message: stripeErrorMessage(json) })
  }
  return json
}
