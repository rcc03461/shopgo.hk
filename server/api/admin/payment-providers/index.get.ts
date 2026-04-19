import { and, eq, inArray } from 'drizzle-orm'
import { createError, isError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { summarizeDbErrorForLog } from '../../../utils/dbErrors'
import {
  ADMIN_PAYMENT_PROVIDER_CODES,
  type AdminPaymentProviderCode,
  parseProviderConfig,
} from '../../../utils/paymentProviderSchemas'
import {
  decryptSecretsJson,
  getPaymentSecretsKey32,
} from '../../../utils/paymentSecretsCrypto'
import { requireTenantSession } from '../../../utils/requireTenantSession'

function secretHints(
  provider: AdminPaymentProviderCode,
  secrets: Record<string, string>,
): Record<string, boolean> {
  if (provider === 'stripe') {
    return {
      secretKey: Boolean(secrets.secretKey),
      webhookSecret: Boolean(secrets.webhookSecret),
    }
  }
  return { clientSecret: Boolean(secrets.clientSecret) }
}

function defaultDisplayOrder(p: AdminPaymentProviderCode): number {
  return p === 'stripe' ? 0 : 1
}

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const db = getDb(event)

  const codes = [...ADMIN_PAYMENT_PROVIDER_CODES]
  try {
    const rows = await db
      .select({
        provider: schema.tenantPaymentProviders.provider,
        enabled: schema.tenantPaymentProviders.enabled,
        displayOrder: schema.tenantPaymentProviders.displayOrder,
        config: schema.tenantPaymentProviders.config,
        secretsEncrypted: schema.tenantPaymentProviders.secretsEncrypted,
      })
      .from(schema.tenantPaymentProviders)
      .where(
        and(
          eq(schema.tenantPaymentProviders.tenantId, session.tenantId),
          inArray(schema.tenantPaymentProviders.provider, codes),
        ),
      )

    const by = new Map(rows.map((r) => [r.provider, r]))
    const key = getPaymentSecretsKey32(event)

    const providers = codes.map((provider) => {
      const row = by.get(provider)
      const enabled = row?.enabled ?? false
      const displayOrder = row?.displayOrder ?? defaultDisplayOrder(provider)
      const config = parseProviderConfig(provider, row?.config)

      let hints: Record<string, boolean> = {}
      if (row?.secretsEncrypted) {
        if (!key) {
          throw createError({
            statusCode: 503,
            message:
              '資料庫含已加密的金流密鑰，請設定 PAYMENT_SECRETS_KEY 後再開啟此頁',
          })
        }
        const secrets = decryptSecretsJson(row.secretsEncrypted, key)
        hints = secretHints(provider, secrets)
      }

      return {
        provider,
        enabled,
        displayOrder,
        config,
        secretHints: hints,
      }
    })

    return { providers }
  } catch (e: unknown) {
    if (isError(e)) throw e
    const sqlState = (e as { cause?: { code?: string } })?.cause?.code
    if (sqlState === '42P01') {
      throw createError({
        statusCode: 503,
        message: '資料庫尚未就緒。請執行：bun run db:migrate',
      })
    }
    console.error('[admin/payment-providers GET]', summarizeDbErrorForLog(e))
    throw createError({ statusCode: 500, message: '無法載入收款設定' })
  }
})
