import { z } from 'zod'

/** 後台支援的渠道（新增時同步擴充 API 與 UI） */
export const ADMIN_PAYMENT_PROVIDER_CODES = ['stripe', 'paypal'] as const
export type AdminPaymentProviderCode = (typeof ADMIN_PAYMENT_PROVIDER_CODES)[number]

export function isAdminPaymentProvider(s: string): s is AdminPaymentProviderCode {
  return (ADMIN_PAYMENT_PROVIDER_CODES as readonly string[]).includes(s)
}

export type StripePaymentConfig = {
  publishableKey?: string
  mode: 'test' | 'live'
}

export type PaypalPaymentConfig = {
  clientId?: string
  environment: 'sandbox' | 'live'
}

const optionalSecretField = z
  .union([z.string().max(2048), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined
    if (v === null) return null
    const t = v.trim()
    return t === '' ? undefined : t
  })

/** Stripe Checkout／PaymentIntents 用 publishable + secret */
export const adminStripePaymentPutBodySchema = z.object({
  enabled: z.boolean(),
  displayOrder: z.number().int().min(0).max(99).optional(),
  publishableKey: z.union([z.string().max(256), z.null()]).optional(),
  mode: z.enum(['test', 'live']).optional(),
  secretKey: optionalSecretField,
  webhookSecret: optionalSecretField,
})

export type AdminStripePaymentPutBody = z.infer<typeof adminStripePaymentPutBodySchema>

/** PayPal Orders API（Express Checkout） */
export const adminPaypalPaymentPutBodySchema = z.object({
  enabled: z.boolean(),
  displayOrder: z.number().int().min(0).max(99).optional(),
  clientId: z.union([z.string().max(256), z.null()]).optional(),
  environment: z.enum(['sandbox', 'live']).optional(),
  clientSecret: optionalSecretField,
})

export type AdminPaypalPaymentPutBody = z.infer<typeof adminPaypalPaymentPutBodySchema>

export function defaultStripeConfig(): StripePaymentConfig {
  return { mode: 'test' }
}

export function defaultPaypalConfig(): PaypalPaymentConfig {
  return { environment: 'sandbox' }
}

function parseStripeConfig(raw: unknown): StripePaymentConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const mode = o.mode === 'live' ? 'live' : 'test'
  const pk = typeof o.publishableKey === 'string' ? o.publishableKey.trim() : ''
  return {
    mode,
    ...(pk ? { publishableKey: pk } : {}),
  }
}

function parsePaypalConfig(raw: unknown): PaypalPaymentConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const env = o.environment === 'live' ? 'live' : 'sandbox'
  const cid = typeof o.clientId === 'string' ? o.clientId.trim() : ''
  return {
    environment: env,
    ...(cid ? { clientId: cid } : {}),
  }
}

export function parseProviderConfig(
  provider: AdminPaymentProviderCode,
  raw: unknown,
): StripePaymentConfig | PaypalPaymentConfig {
  return provider === 'stripe' ? parseStripeConfig(raw) : parsePaypalConfig(raw)
}
