import { and, eq } from 'drizzle-orm'
import { createError, getCookie } from 'h3'
import type { H3Event } from 'h3'
import * as schema from '../database/schema'
import { CUSTOMER_AUTH_COOKIE, verifyCustomerSessionToken } from './customerAuthJwt'
import { getDb } from './db'
import { requireTenantStoreContext } from './requireTenantStoreContext'

export async function requireStoreCustomerSession(event: H3Event) {
  const token = getCookie(event, CUSTOMER_AUTH_COOKIE)
  if (!token) {
    throw createError({ statusCode: 401, message: '請先登入會員' })
  }

  const tenant = await requireTenantStoreContext(event)
  const session = await verifyCustomerSessionToken(event, token)
  if (!tenant.tenantId || !tenant.shopSlug) {
    throw createError({ statusCode: 401, message: '商店識別資訊無效，請重新登入' })
  }
  if (session.tenantId !== tenant.tenantId || session.shopSlug !== tenant.shopSlug) {
    throw createError({ statusCode: 403, message: '登入狀態與商店網域不符' })
  }

  const db = getDb(event)
  const rows = await db
    .select({
      id: schema.customers.id,
      tenantId: schema.customers.tenantId,
      email: schema.customers.email,
      fullName: schema.customers.fullName,
      phone: schema.customers.phone,
      status: schema.customers.status,
    })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.id, session.sub),
        eq(schema.customers.tenantId, tenant.tenantId),
      ),
    )
    .limit(1)
  const customer = rows[0]
  if (!customer || customer.status !== 'active') {
    throw createError({ statusCode: 401, message: '會員帳號不可用' })
  }

  return { tenant, customer }
}
