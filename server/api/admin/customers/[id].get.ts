import { and, count, desc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

const customerIdParamSchema = z.string().uuid('顧客 id 格式不正確')

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const idParsed = customerIdParamSchema.safeParse(getRouterParam(event, 'id'))
  if (!idParsed.success) {
    throw createError({
      statusCode: 404,
      message: idParsed.error.issues[0]?.message ?? '顧客 id 格式不正確',
    })
  }
  const customerId = idParsed.data
  const db = getDb(event)

  const [customer] = await db
    .select({
      id: schema.customers.id,
      email: schema.customers.email,
      fullName: schema.customers.fullName,
      phone: schema.customers.phone,
      status: schema.customers.status,
      createdAt: schema.customers.createdAt,
      updatedAt: schema.customers.updatedAt,
    })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.id, customerId),
        eq(schema.customers.tenantId, session.tenantId),
      ),
    )
    .limit(1)

  if (!customer) {
    throw createError({ statusCode: 404, message: '找不到顧客' })
  }

  const [orderStats] = await db
    .select({ totalOrders: count() })
    .from(schema.shopOrders)
    .where(
      and(
        eq(schema.shopOrders.tenantId, session.tenantId),
        eq(schema.shopOrders.customerId, customer.id),
      ),
    )

  const recentOrders = await db
    .select({
      id: schema.shopOrders.id,
      invoicePublicId: schema.shopOrders.invoicePublicId,
      status: schema.shopOrders.status,
      currency: schema.shopOrders.currency,
      total: schema.shopOrders.total,
      createdAt: schema.shopOrders.createdAt,
    })
    .from(schema.shopOrders)
    .where(
      and(
        eq(schema.shopOrders.tenantId, session.tenantId),
        eq(schema.shopOrders.customerId, customer.id),
      ),
    )
    .orderBy(desc(schema.shopOrders.createdAt), desc(schema.shopOrders.id))
    .limit(10)

  return {
    customer: {
      ...customer,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    },
    stats: {
      totalOrders: Number(orderStats?.totalOrders ?? 0),
    },
    recentOrders: recentOrders.map((row) => ({
      ...row,
      total: String(row.total),
      createdAt: row.createdAt.toISOString(),
    })),
  }
})
