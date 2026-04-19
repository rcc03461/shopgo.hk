import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import type { H3Event } from 'h3'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'
import {
  decryptSecretsJson,
  getPaymentSecretsKey32,
} from './paymentSecretsCrypto'
import type { AdminPaymentProviderCode } from './paymentProviderSchemas'

type Db = PostgresJsDatabase<typeof schema>

export async function loadTenantPaymentSecrets(
  event: H3Event,
  db: Db,
  tenantId: string,
  provider: AdminPaymentProviderCode,
) {
  const [row] = await db
    .select()
    .from(schema.tenantPaymentProviders)
    .where(
      and(
        eq(schema.tenantPaymentProviders.tenantId, tenantId),
        eq(schema.tenantPaymentProviders.provider, provider),
      ),
    )
    .limit(1)

  if (!row?.enabled) return null

  const key = getPaymentSecretsKey32(event)
  let secrets: Record<string, string> = {}
  if (row.secretsEncrypted) {
    if (!key) {
      throw createError({
        statusCode: 503,
        message:
          '商店金流密鑰無法解密：請設定 PAYMENT_SECRETS_KEY（伺服器環境變數）',
      })
    }
    secrets = decryptSecretsJson(row.secretsEncrypted, key)
  }

  return { row, secrets }
}
