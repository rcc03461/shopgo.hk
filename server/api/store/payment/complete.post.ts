import { and, eq } from 'drizzle-orm'
import { createError, readBody } from 'h3'
import { z } from 'zod'
import * as schema from '../../../database/schema'
import { getDb } from '../../../utils/db'
import { parseProviderConfig } from '../../../utils/paymentProviderSchemas'
import {
  decrementStockForLines,
  type ShopDb,
  type StockDecLine,
} from '../../../utils/storeCheckoutResolveLines'
import {
  paypalCaptureOrder,
  paypalFetchAccessToken,
} from '../../../utils/storePaypalHttp'
import { stripeGetJson } from '../../../utils/storeStripeHttp'
import { loadTenantPaymentSecrets } from '../../../utils/storeTenantPayment'
import { requireStoreTenant } from '../../../utils/storeTenant'

const bodySchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('stripe'),
    orderId: z.string().uuid(),
    sessionId: z.string().min(8),
  }),
  z.object({
    provider: z.literal('paypal'),
    orderId: z.string().uuid(),
    paypalOrderId: z.string().min(8),
  }),
])

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '驗證失敗',
    })
  }
  const body = parsed.data
  const db = getDb(event)

  const [order] = await db
    .select()
    .from(schema.shopOrders)
    .where(
      and(
        eq(schema.shopOrders.id, body.orderId),
        eq(schema.shopOrders.tenantId, tenant.id),
      ),
    )
    .limit(1)

  if (!order) {
    throw createError({ statusCode: 404, message: '找不到訂單' })
  }

  if (order.status === 'paid') {
    return {
      ok: true as const,
      alreadyCompleted: true as const,
      invoicePublicId: order.invoicePublicId,
    }
  }

  if (order.status === 'payment_failed') {
    throw createError({
      statusCode: 400,
      message: '訂單付款已失敗，請重新下單',
    })
  }

  const stockRows = await db
    .select({
      productVariantId: schema.shopOrderLines.productVariantId,
      quantity: schema.shopOrderLines.quantity,
    })
    .from(schema.shopOrderLines)
    .where(eq(schema.shopOrderLines.orderId, order.id))

  const stockLines: StockDecLine[] = stockRows.map((r) => ({
    productVariantId: r.productVariantId,
    quantity: r.quantity,
  }))

  if (body.provider === 'stripe') {
    if (order.paymentProvider !== 'stripe') {
      throw createError({ statusCode: 400, message: '訂單付款渠道不符' })
    }
    const pay = await loadTenantPaymentSecrets(event, db, tenant.id, 'stripe')
    const secretKey = pay?.secrets.secretKey
    if (!secretKey) {
      throw createError({ statusCode: 503, message: 'Stripe 金流未設定' })
    }
    const session = await stripeGetJson(
      secretKey,
      `/checkout/sessions/${encodeURIComponent(body.sessionId)}`,
    )
    const meta = session.metadata as Record<string, string> | undefined
    if (meta?.orderId !== body.orderId) {
      throw createError({ statusCode: 400, message: '付款工作階段與訂單不符' })
    }
    if (session.payment_status !== 'paid') {
      throw createError({ statusCode: 400, message: '付款尚未完成' })
    }

    await db.transaction(async (tx) => {
      await decrementStockForLines(tx as ShopDb, stockLines)
      await tx
        .update(schema.shopOrders)
        .set({
          status: 'paid',
          paymentReference: body.sessionId,
          updatedAt: new Date(),
        })
        .where(eq(schema.shopOrders.id, order.id))
    })

    return {
      ok: true as const,
      invoicePublicId: order.invoicePublicId,
    }
  }

  if (order.paymentProvider !== 'paypal') {
    throw createError({ statusCode: 400, message: '訂單付款渠道不符' })
  }
  if (order.paymentReference && order.paymentReference !== body.paypalOrderId) {
    throw createError({ statusCode: 400, message: 'PayPal 訂單編號不符' })
  }

  const pay = await loadTenantPaymentSecrets(event, db, tenant.id, 'paypal')
  const clientSecret = pay?.secrets.clientSecret
  const cfg = pay ? parseProviderConfig('paypal', pay.row.config) : null
  if (!pay || !clientSecret || !cfg?.clientId) {
    throw createError({ statusCode: 503, message: 'PayPal 金流未設定' })
  }

  const accessToken = await paypalFetchAccessToken(
    cfg.environment,
    cfg.clientId,
    clientSecret,
  )
  const cap = await paypalCaptureOrder(
    cfg.environment,
    accessToken,
    body.paypalOrderId,
  )
  const st = typeof cap.status === 'string' ? cap.status : ''
  if (st !== 'COMPLETED') {
    throw createError({ statusCode: 400, message: 'PayPal 請款未完成' })
  }

  await db.transaction(async (tx) => {
    await decrementStockForLines(tx as ShopDb, stockLines)
    await tx
      .update(schema.shopOrders)
      .set({
        status: 'paid',
        paymentReference: body.paypalOrderId,
        updatedAt: new Date(),
      })
      .where(eq(schema.shopOrders.id, order.id))
  })

  return {
    ok: true as const,
    invoicePublicId: order.invoicePublicId,
  }
})
