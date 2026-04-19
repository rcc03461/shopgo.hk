import { and, eq, inArray } from 'drizzle-orm'
import {
  ADMIN_PAYMENT_PROVIDER_CODES,
  parseProviderConfig,
} from '../../utils/paymentProviderSchemas'
import * as schema from '../../database/schema'
import { getDb } from '../../utils/db'
import { requireStoreTenant } from '../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const db = getDb(event)

  const codes = [...ADMIN_PAYMENT_PROVIDER_CODES]
  const rows = await db
    .select()
    .from(schema.tenantPaymentProviders)
    .where(
      and(
        eq(schema.tenantPaymentProviders.tenantId, tenant.id),
        inArray(schema.tenantPaymentProviders.provider, codes),
      ),
    )

  const providers: {
    code: string
    enabled: boolean
    displayOrder: number
    stripePublishableKey?: string
    stripeMode?: string
    paypalClientId?: string
    paypalEnvironment?: string
  }[] = []

  for (const code of codes) {
    const row = rows.find((r) => r.provider === code)
    const enabled = Boolean(row?.enabled)
    const displayOrder = row?.displayOrder ?? (code === 'stripe' ? 0 : 1)
    if (code === 'stripe') {
      const cfg = parseProviderConfig('stripe', row?.config)
      providers.push({
        code: 'stripe',
        enabled,
        displayOrder,
        stripePublishableKey: cfg.publishableKey,
        stripeMode: cfg.mode,
      })
    } else {
      const cfg = parseProviderConfig('paypal', row?.config)
      providers.push({
        code: 'paypal',
        enabled,
        displayOrder,
        paypalClientId: cfg.clientId,
        paypalEnvironment: cfg.environment,
      })
    }
  }

  providers.sort((a, b) => a.displayOrder - b.displayOrder)

  return { providers }
})
