import { eq } from 'drizzle-orm'
import { createError, getRequestURL, readBody } from 'h3'
import * as schema from '../../database/schema'
import { getDb } from '../../utils/db'
import { parseProviderConfig } from '../../utils/paymentProviderSchemas'
import { resolveCheckoutLines } from '../../utils/storeCheckoutResolveLines'
import { storeCheckoutBodySchema } from '../../utils/storeCheckoutSchemas'
import {
  paypalCreateOrderJson,
  paypalFetchAccessToken,
} from '../../utils/storePaypalHttp'
import { stripePostForm } from '../../utils/storeStripeHttp'
import { loadTenantPaymentSecrets } from '../../utils/storeTenantPayment'
import { requireStoreTenant } from '../../utils/storeTenant'

export default defineEventHandler(async (event) => {
  const tenant = await requireStoreTenant(event)
  const raw = await readBody(event)
  const parsed = storeCheckoutBodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '驗證失敗',
    })
  }
  const input = parsed.data
  const db = getDb(event)

  const payment = await loadTenantPaymentSecrets(event, db, tenant.id, input.provider)
  if (!payment) {
    throw createError({ statusCode: 400, message: '此付款方式未啟用' })
  }

  const { lines, subtotal, total } = await resolveCheckoutLines(
    db,
    tenant.id,
    input.items,
  )

  const [order] = await db
    .insert(schema.shopOrders)
    .values({
      tenantId: tenant.id,
      status: 'pending_payment',
      paymentProvider: input.provider,
      currency: 'HKD',
      subtotal,
      total,
      customerEmail: input.customerEmail ?? null,
    })
    .returning()

  if (!order) {
    throw createError({ statusCode: 500, message: '建立訂單失敗' })
  }

  await db.insert(schema.shopOrderLines).values(
    lines.map((l) => ({
      orderId: order.id,
      productId: l.productId,
      productVariantId: l.productVariantId,
      titleSnapshot: l.titleSnapshot,
      skuSnapshot: l.skuSnapshot,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
  )

  const reqUrl = getRequestURL(event)
  const origin = `${reqUrl.protocol}//${reqUrl.host}`

  try {
    if (input.provider === 'stripe') {
      const secretKey = payment.secrets.secretKey
      if (!secretKey) {
        throw createError({
          statusCode: 503,
          message: 'Stripe 未完成金流設定（缺少 Secret Key）',
        })
      }
      const successUrl = `${origin}/payment/complete?provider=stripe&orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${origin}/cart`

      const flat: Record<string, string> = {
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: order.id,
        'metadata[orderId]': order.id,
        'metadata[shop]': tenant.shopSlug,
      }

      lines.forEach((line, i) => {
        const cents = Math.round(Number(line.unitPrice) * 100)
        flat[`line_items[${i}][quantity]`] = String(line.quantity)
        flat[`line_items[${i}][price_data][currency]`] = 'hkd'
        flat[`line_items[${i}][price_data][unit_amount]`] = String(cents)
        flat[`line_items[${i}][price_data][product_data][name]`] = line.titleSnapshot.slice(
          0,
          120,
        )
      })

      const session = await stripePostForm(secretKey, '/checkout/sessions', flat)
      const sid = typeof session.id === 'string' ? session.id : ''
      const checkoutUrl = typeof session.url === 'string' ? session.url : ''
      if (!checkoutUrl) {
        throw createError({ statusCode: 502, message: 'Stripe 未返回結帳網址' })
      }
      await db
        .update(schema.shopOrders)
        .set({
          paymentReference: sid,
          updatedAt: new Date(),
        })
        .where(eq(schema.shopOrders.id, order.id))

      return {
        ok: true as const,
        orderId: order.id,
        invoicePublicId: order.invoicePublicId,
        redirectUrl: checkoutUrl,
      }
    }

    const clientSecret = payment.secrets.clientSecret
    const cfg = parseProviderConfig('paypal', payment.row.config)
    if (!cfg.clientId || !clientSecret) {
      throw createError({ statusCode: 503, message: 'PayPal 未完成金流設定' })
    }
    const accessToken = await paypalFetchAccessToken(
      cfg.environment,
      cfg.clientId,
      clientSecret,
    )
    const total2 = Number(total).toFixed(2)
    const returnUrl = `${origin}/payment/complete?provider=paypal&orderId=${encodeURIComponent(order.id)}`
    const cancelUrl = `${origin}/cart`
    const ppBody = {
      intent: 'CAPTURE' as const,
      purchase_units: [
        {
          reference_id: order.id.slice(0, 12),
          custom_id: order.id,
          description: 'OShop order',
          amount: {
            currency_code: 'HKD',
            value: total2,
          },
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    }
    const po = await paypalCreateOrderJson(cfg.environment, accessToken, ppBody)
    const approve = po.links?.find((l) => l.rel === 'approve')?.href
    if (!approve) {
      throw createError({ statusCode: 502, message: 'PayPal 未返回核准網址' })
    }
    await db
      .update(schema.shopOrders)
      .set({
        paymentReference: po.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.shopOrders.id, order.id))

    return {
      ok: true as const,
      orderId: order.id,
      invoicePublicId: order.invoicePublicId,
      redirectUrl: approve,
    }
  } catch (e) {
    await db
      .update(schema.shopOrders)
      .set({
        status: 'payment_failed',
        updatedAt: new Date(),
      })
      .where(eq(schema.shopOrders.id, order.id))
    throw e
  }
})
