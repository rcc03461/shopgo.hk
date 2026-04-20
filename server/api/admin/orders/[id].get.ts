import { and, asc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { requireTenantSession } from '../../../utils/requireTenantSession'

export default defineEventHandler(async (event) => {
  const session = await requireTenantSession(event)
  const id = String(event.context.params?.id ?? '').trim()
  if (!id) {
    throw createError({ statusCode: 400, message: '缺少訂單 id' })
  }

  const db = getDb(event)
  const tenantId = session.tenantId

  const [order] = await db
    .select()
    .from(schema.shopOrders)
    .where(
      and(eq(schema.shopOrders.id, id), eq(schema.shopOrders.tenantId, tenantId)),
    )
    .limit(1)

  if (!order) {
    throw createError({ statusCode: 404, message: '找不到訂單' })
  }

  const lines = await db
    .select({
      id: schema.shopOrderLines.id,
      productId: schema.shopOrderLines.productId,
      productVariantId: schema.shopOrderLines.productVariantId,
      titleSnapshot: schema.shopOrderLines.titleSnapshot,
      skuSnapshot: schema.shopOrderLines.skuSnapshot,
      unitPrice: schema.shopOrderLines.unitPrice,
      quantity: schema.shopOrderLines.quantity,
      lineTotal: schema.shopOrderLines.lineTotal,
    })
    .from(schema.shopOrderLines)
    .where(eq(schema.shopOrderLines.orderId, order.id))
    .orderBy(asc(schema.shopOrderLines.id))

  return {
    order: {
      id: order.id,
      invoicePublicId: order.invoicePublicId,
      status: order.status,
      paymentProvider: order.paymentProvider,
      paymentReference: order.paymentReference,
      currency: order.currency,
      subtotal: String(order.subtotal),
      total: String(order.total),
      customerEmail: order.customerEmail,
      shippingData:
        order.shippingData && typeof order.shippingData === 'object'
          ? (order.shippingData as Record<string, unknown>)
          : null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    },
    lines: lines.map((l) => ({
      ...l,
      unitPrice: String(l.unitPrice),
      lineTotal: String(l.lineTotal),
    })),
  }
})
