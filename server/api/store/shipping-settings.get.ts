import { eq } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { getDb } from '../../utils/db'
import { requireStoreTenant } from '../../utils/storeTenant'

const DEFAULT_METHODS = ['Standard Shipping']

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const db = getDb(event)

  const [row] = await db
    .select({ settings: schema.tenants.settings })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenant.id))
    .limit(1)

  const settings =
    row && typeof row.settings === 'object' && row.settings
      ? (row.settings as Record<string, unknown>)
      : {}

  const methodsRaw = Array.isArray(settings.shippingMethods)
    ? settings.shippingMethods
    : DEFAULT_METHODS
  const methods = methodsRaw
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
  const shippingMethods = methods.length > 0 ? methods : DEFAULT_METHODS

  const shippingForm =
    typeof settings.shippingForm === 'object' && settings.shippingForm
      ? (settings.shippingForm as Record<string, unknown>)
      : {}

  return {
    shippingMethods,
    shippingForm: {
      name: shippingForm.name === false ? false : true,
      email: shippingForm.email === false ? false : true,
      phone: shippingForm.phone === false ? false : true,
      address: shippingForm.address === false ? false : true,
      remarks: shippingForm.remarks === false ? false : true,
    },
  }
})
