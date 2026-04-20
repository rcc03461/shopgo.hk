import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getCookie } from 'h3'
import type { H3Event } from 'h3'
import * as schema from '../database/schema'
import type { CustomerSessionPayload } from './customerAuthJwt'
import { CUSTOMER_AUTH_COOKIE, verifyCustomerSessionToken } from './customerAuthJwt'
import { getDb } from './db'
import { requireTenantStoreContext } from './requireTenantStoreContext'
import { getOrCreateStoreCartSessionKey, STORE_CART_COOKIE } from './storeCartSession'

export type StoreCartLineDto = {
  id: string
  productId: string
  productSlug: string
  variantId: string | null
  title: string
  unitPrice: string
  qty: number
  optionSummary?: string
  isValid: boolean
  validationMessage?: string
}

async function resolveStoreCustomerSession(
  event: H3Event,
  tenantId: string,
  shopSlug: string,
): Promise<CustomerSessionPayload | null> {
  const token = getCookie(event, CUSTOMER_AUTH_COOKIE)
  if (!token) return null
  try {
    const session = await verifyCustomerSessionToken(event, token)
    if (session.tenantId !== tenantId || session.shopSlug !== shopSlug) return null
    return session
  } catch {
    return null
  }
}

async function ensureActiveCartId(
  event: H3Event,
  tenantId: string,
  customerId: string | null,
): Promise<string> {
  const db = getDb(event)
  if (customerId) {
    const existing = await db
      .select({ id: schema.shopCarts.id })
      .from(schema.shopCarts)
      .where(
        and(
          eq(schema.shopCarts.tenantId, tenantId),
          eq(schema.shopCarts.customerId, customerId),
          eq(schema.shopCarts.status, 'active'),
        ),
      )
      .limit(1)
    if (existing[0]) return existing[0].id
    const created = await db
      .insert(schema.shopCarts)
      .values({ tenantId, customerId, status: 'active' })
      .returning({ id: schema.shopCarts.id })
    return created[0]!.id
  }

  const sessionKey = getOrCreateStoreCartSessionKey(event)
  const existing = await db
    .select({ id: schema.shopCarts.id })
    .from(schema.shopCarts)
    .where(
      and(
        eq(schema.shopCarts.tenantId, tenantId),
        eq(schema.shopCarts.sessionKey, sessionKey),
        eq(schema.shopCarts.status, 'active'),
      ),
    )
    .limit(1)
  if (existing[0]) return existing[0].id
  const created = await db
    .insert(schema.shopCarts)
    .values({ tenantId, sessionKey, status: 'active' })
    .returning({ id: schema.shopCarts.id })
  return created[0]!.id
}

export async function resolveStoreCartContext(event: H3Event): Promise<{
  tenantId: string
  shopSlug: string
  customerId: string | null
  cartId: string
}> {
  const tenant = await requireTenantStoreContext(event)
  const session = await resolveStoreCustomerSession(event, tenant.tenantId, tenant.shopSlug)
  const customerId = session?.sub ?? null
  const cartId = await ensureActiveCartId(event, tenant.tenantId, customerId)
  return { tenantId: tenant.tenantId, shopSlug: tenant.shopSlug, customerId, cartId }
}

export async function getStoreCartLines(event: H3Event, cartId: string) {
  const db = getDb(event)
  const rows = await db
    .select({
      id: schema.shopCartLines.id,
      productId: schema.shopCartLines.productId,
      variantId: schema.shopCartLines.productVariantId,
      productSlug: schema.shopCartLines.productSlugSnapshot,
      title: schema.shopCartLines.titleSnapshot,
      unitPrice: schema.shopCartLines.unitPriceSnapshot,
      qty: schema.shopCartLines.quantity,
      optionSummary: schema.shopCartLines.optionSummary,
    })
    .from(schema.shopCartLines)
    .where(eq(schema.shopCartLines.cartId, cartId))

  const productIds = [...new Set(rows.map((r) => r.productId))]
  const products =
    productIds.length > 0
      ? await db
          .select({
            id: schema.products.id,
            slug: schema.products.slug,
            title: schema.products.title,
          })
          .from(schema.products)
          .where(inArray(schema.products.id, productIds))
      : []
  const productMap = new Map(products.map((p) => [p.id, p]))

  const variants =
    productIds.length > 0
      ? await db
          .select({
            id: schema.productVariants.id,
            productId: schema.productVariants.productId,
            skuCode: schema.productVariants.skuCode,
            stockQuantity: schema.productVariants.stockQuantity,
          })
          .from(schema.productVariants)
          .where(inArray(schema.productVariants.productId, productIds))
      : []
  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const variantCountByProduct = new Map<string, number>()
  for (const v of variants) {
    variantCountByProduct.set(
      v.productId,
      (variantCountByProduct.get(v.productId) ?? 0) + 1,
    )
  }

  return rows.map((r): StoreCartLineDto => ({
    ...(() => {
      const product = productMap.get(r.productId)
      if (!product) {
        return {
          isValid: false,
          validationMessage: '此商品已下架或不存在，請移除此項目',
        }
      }
      if (r.variantId) {
        const v = variantMap.get(r.variantId)
        if (!v || v.productId !== r.productId) {
          return {
            isValid: false,
            validationMessage: `「${r.title}」的規格已失效，請重新選擇`,
          }
        }
        if (v.stockQuantity < r.qty) {
          return {
            isValid: false,
            validationMessage: `「${r.title}」庫存不足（目前最多 ${Math.max(0, v.stockQuantity)} 件）`,
          }
        }
        return { isValid: true as const }
      }
      if ((variantCountByProduct.get(r.productId) ?? 0) > 0) {
        return {
          isValid: false,
          validationMessage: `「${r.title}」規格已更新，請重新選擇後再下單`,
        }
      }
      return { isValid: true as const }
    })(),
    id: r.id,
    productId: r.productId,
    variantId: r.variantId,
    productSlug: r.productSlug,
    title: r.title,
    unitPrice: r.unitPrice,
    qty: r.qty,
    ...(r.optionSummary ? { optionSummary: r.optionSummary } : {}),
  }))
}

export async function mergeSessionCartIntoCustomerCart(
  event: H3Event,
  tenantId: string,
  customerId: string,
) {
  const db = getDb(event)
  const sessionKey = getCookie(event, STORE_CART_COOKIE)
  if (!sessionKey) return

  const [guestCart] = await db
    .select({ id: schema.shopCarts.id })
    .from(schema.shopCarts)
    .where(
      and(
        eq(schema.shopCarts.tenantId, tenantId),
        eq(schema.shopCarts.sessionKey, sessionKey),
        eq(schema.shopCarts.status, 'active'),
      ),
    )
    .limit(1)
  if (!guestCart) return

  const [memberCart] = await db
    .select({ id: schema.shopCarts.id })
    .from(schema.shopCarts)
    .where(
      and(
        eq(schema.shopCarts.tenantId, tenantId),
        eq(schema.shopCarts.customerId, customerId),
        eq(schema.shopCarts.status, 'active'),
      ),
    )
    .limit(1)

  const targetCartId =
    memberCart?.id ??
    (
      await db
        .insert(schema.shopCarts)
        .values({ tenantId, customerId, status: 'active' })
        .returning({ id: schema.shopCarts.id })
    )[0]!.id

  if (guestCart.id === targetCartId) return

  const guestLines = await db
    .select()
    .from(schema.shopCartLines)
    .where(eq(schema.shopCartLines.cartId, guestCart.id))

  for (const line of guestLines) {
    const match = await db
      .select({
        id: schema.shopCartLines.id,
        qty: schema.shopCartLines.quantity,
      })
      .from(schema.shopCartLines)
      .where(
        and(
          eq(schema.shopCartLines.cartId, targetCartId),
          eq(schema.shopCartLines.productId, line.productId),
          line.productVariantId
            ? eq(schema.shopCartLines.productVariantId, line.productVariantId)
            : isNull(schema.shopCartLines.productVariantId),
        ),
      )
      .limit(1)

    const exist = match[0]
    if (exist) {
      await db
        .update(schema.shopCartLines)
        .set({
          quantity: Math.min(99, exist.qty + line.quantity),
          updatedAt: new Date(),
        })
        .where(eq(schema.shopCartLines.id, exist.id))
    } else {
      await db.insert(schema.shopCartLines).values({
        cartId: targetCartId,
        productId: line.productId,
        productVariantId: line.productVariantId,
        quantity: line.quantity,
        titleSnapshot: line.titleSnapshot,
        productSlugSnapshot: line.productSlugSnapshot,
        unitPriceSnapshot: line.unitPriceSnapshot,
        optionSummary: line.optionSummary,
      })
    }
  }

  await db.delete(schema.shopCartLines).where(eq(schema.shopCartLines.cartId, guestCart.id))
  await db
    .update(schema.shopCarts)
    .set({
      status: 'merged',
      updatedAt: new Date(),
      customerId,
      sessionKey: null,
    })
    .where(eq(schema.shopCarts.id, guestCart.id))
}

export async function fetchProductSnapshots(
  event: H3Event,
  tenantId: string,
  productId: string,
  variantId: string | null,
) {
  const db = getDb(event)
  const [product] = await db
    .select({
      id: schema.products.id,
      slug: schema.products.slug,
      title: schema.products.title,
      basePrice: schema.products.basePrice,
    })
    .from(schema.products)
    .where(
      and(eq(schema.products.id, productId), eq(schema.products.tenantId, tenantId)),
    )
    .limit(1)
  if (!product) return null

  if (!variantId) {
    return {
      productId: product.id,
      productSlug: product.slug,
      title: product.title,
      unitPrice: product.basePrice,
      variantId: null as string | null,
    }
  }

  const [variant] = await db
    .select({
      id: schema.productVariants.id,
      price: schema.productVariants.price,
      productId: schema.productVariants.productId,
    })
    .from(schema.productVariants)
    .where(
      and(
        eq(schema.productVariants.id, variantId),
        eq(schema.productVariants.productId, productId),
      ),
    )
    .limit(1)
  if (!variant) return null

  return {
    productId: product.id,
    productSlug: product.slug,
    title: product.title,
    unitPrice: variant.price,
    variantId: variant.id,
  }
}
