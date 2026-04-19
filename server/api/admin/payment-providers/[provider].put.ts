import { and, eq, sql } from 'drizzle-orm'
import { createError, isError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { summarizeDbErrorForLog } from '../../../utils/dbErrors'
import {
  adminPaypalPaymentPutBodySchema,
  adminStripePaymentPutBodySchema,
  defaultPaypalConfig,
  defaultStripeConfig,
  isAdminPaymentProvider,
  parseProviderConfig,
  type AdminPaymentProviderCode,
  type AdminPaypalPaymentPutBody,
  type AdminStripePaymentPutBody,
  type PaypalPaymentConfig,
  type StripePaymentConfig,
} from '../../../utils/paymentProviderSchemas'
import {
  decryptSecretsJson,
  encryptSecretsJson,
  getPaymentSecretsKey32,
  requirePaymentSecretsKey,
} from '../../../utils/paymentSecretsCrypto'
import { requireTenantSession } from '../../../utils/requireTenantSession'

function defaultDisplayOrder(p: AdminPaymentProviderCode): number {
  return p === 'stripe' ? 0 : 1
}

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const rawProvider = getRouterParam(event, 'provider')
  if (!isAdminPaymentProvider(String(rawProvider))) {
    throw createError({ statusCode: 400, message: '不支援的渠道' })
  }
  const provider = rawProvider as AdminPaymentProviderCode

  const body = await readBody(event)
  const parsed =
    provider === 'stripe'
      ? adminStripePaymentPutBodySchema.safeParse(body)
      : adminPaypalPaymentPutBodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '資料驗證失敗'
    throw createError({ statusCode: 400, message: msg })
  }

  const db = getDb(event)

  const [existing] = await db
    .select({
      secretsEncrypted: schema.tenantPaymentProviders.secretsEncrypted,
      config: schema.tenantPaymentProviders.config,
      displayOrder: schema.tenantPaymentProviders.displayOrder,
    })
    .from(schema.tenantPaymentProviders)
    .where(
      and(
        eq(schema.tenantPaymentProviders.tenantId, session.tenantId),
        eq(schema.tenantPaymentProviders.provider, provider),
      ),
    )
    .limit(1)

  const wantsSecretChange =
    provider === 'stripe'
      ? (parsed.data as AdminStripePaymentPutBody).secretKey !== undefined ||
        (parsed.data as AdminStripePaymentPutBody).webhookSecret !== undefined
      : (parsed.data as AdminPaypalPaymentPutBody).clientSecret !== undefined

  const needsCryptoKey = Boolean(existing?.secretsEncrypted) || wantsSecretChange

  if (needsCryptoKey && !getPaymentSecretsKey32(event)) {
    throw createError({
      statusCode: 503,
      message:
        '此儲存內容涉及加密金流密鑰：請設定 PAYMENT_SECRETS_KEY（openssl rand -base64 32）',
    })
  }

  const cryptoKey = needsCryptoKey ? requirePaymentSecretsKey(event) : null

  let prevSecrets: Record<string, string> = {}
  if (existing?.secretsEncrypted && cryptoKey) {
    prevSecrets = decryptSecretsJson(existing.secretsEncrypted, cryptoKey)
  }

  const nextSecrets: Record<string, string> = { ...prevSecrets }

  if (provider === 'stripe') {
    const data = parsed.data as AdminStripePaymentPutBody
    if (data.secretKey !== undefined) {
      if (data.secretKey === null) delete nextSecrets.secretKey
      else nextSecrets.secretKey = data.secretKey
    }
    if (data.webhookSecret !== undefined) {
      if (data.webhookSecret === null) delete nextSecrets.webhookSecret
      else nextSecrets.webhookSecret = data.webhookSecret
    }
  } else {
    const data = parsed.data as AdminPaypalPaymentPutBody
    if (data.clientSecret !== undefined) {
      if (data.clientSecret === null) delete nextSecrets.clientSecret
      else nextSecrets.clientSecret = data.clientSecret
    }
  }

  const displayOrder =
    parsed.data.displayOrder !== undefined
      ? parsed.data.displayOrder
      : (existing?.displayOrder ?? defaultDisplayOrder(provider))

  let nextConfig: Record<string, unknown>

  if (provider === 'stripe') {
    const data = parsed.data as AdminStripePaymentPutBody
    const base: StripePaymentConfig = existing
      ? (parseProviderConfig('stripe', existing.config) as StripePaymentConfig)
      : defaultStripeConfig()
    const out: Record<string, unknown> = { mode: base.mode }
    if (base.publishableKey) out.publishableKey = base.publishableKey
    // 未帶欄位表示不變更（避免前端反覆儲存時誤清）
    if (data.publishableKey !== undefined) {
      if (data.publishableKey === null || data.publishableKey.trim() === '') {
        delete out.publishableKey
      } else {
        out.publishableKey = data.publishableKey.trim()
      }
    }
    if (data.mode !== undefined) out.mode = data.mode
    nextConfig = out
  } else {
    const data = parsed.data as AdminPaypalPaymentPutBody
    const base: PaypalPaymentConfig = existing
      ? (parseProviderConfig('paypal', existing.config) as PaypalPaymentConfig)
      : defaultPaypalConfig()
    const out: Record<string, unknown> = { environment: base.environment }
    if (base.clientId) out.clientId = base.clientId
    if (data.clientId !== undefined) {
      if (data.clientId === null || data.clientId.trim() === '') {
        delete out.clientId
      } else {
        out.clientId = data.clientId.trim()
      }
    }
    if (data.environment !== undefined) out.environment = data.environment
    nextConfig = out
  }

  const secretsEncrypted =
    Object.keys(nextSecrets).length > 0
      ? encryptSecretsJson(nextSecrets, requirePaymentSecretsKey(event))
      : null

  try {
    await db
      .insert(schema.tenantPaymentProviders)
      .values({
        tenantId: session.tenantId,
        provider,
        enabled: parsed.data.enabled,
        displayOrder,
        config: nextConfig,
        secretsEncrypted,
        updatedAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [
          schema.tenantPaymentProviders.tenantId,
          schema.tenantPaymentProviders.provider,
        ],
        set: {
          enabled: parsed.data.enabled,
          displayOrder,
          config: nextConfig,
          secretsEncrypted,
          updatedAt: sql`now()`,
        },
      })

    return { ok: true as const }
  } catch (e: unknown) {
    if (isError(e)) throw e
    const sqlState = (e as { cause?: { code?: string } })?.cause?.code
    if (sqlState === '42P01') {
      throw createError({
        statusCode: 503,
        message: '資料庫尚未就緒。請執行：bun run db:migrate',
      })
    }
    console.error('[admin/payment-providers PUT]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '儲存收款設定失敗' })
  }
})
