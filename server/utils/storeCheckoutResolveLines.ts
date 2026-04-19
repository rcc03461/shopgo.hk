import { and, asc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../database/schema'

export type ShopDb = PostgresJsDatabase<typeof schema>

export type CheckoutItemInput = {
  productId: string
  variantId?: string | null
  quantity: number
}

export type ResolvedOrderLine = {
  productId: string
  productVariantId: string | null
  titleSnapshot: string
  skuSnapshot: string
  unitPrice: string
  quantity: number
  lineTotal: string
}

function decimalMul(price: string, qty: number): string {
  const n = Number(price) * qty
  if (!Number.isFinite(n)) {
    throw createError({ statusCode: 400, message: '價格計算異常' })
  }
  return n.toFixed(4)
}

function sumDecimals(values: string[]): string {
  const s = values.reduce((a, b) => a + Number(b), 0)
  return s.toFixed(4)
}

/**
 * 合併相同商品／規格列，避免重複寫入。
 */
export function mergeCheckoutItems(items: CheckoutItemInput[]): CheckoutItemInput[] {
  const map = new Map<string, CheckoutItemInput>()
  for (const it of items) {
    const vid = it.variantId ?? null
    const key = `${it.productId}:${vid ?? ''}`
    const prev = map.get(key)
    if (prev) {
      prev.quantity += it.quantity
      if (prev.quantity > 99) {
        throw createError({ statusCode: 400, message: '單一商品數量不可超過 99' })
      }
    } else {
      map.set(key, {
        productId: it.productId,
        variantId: vid,
        quantity: it.quantity,
      })
    }
  }
  return [...map.values()]
}

export async function resolveCheckoutLines(
  db: ShopDb,
  tenantId: string,
  items: CheckoutItemInput[],
): Promise<{ lines: ResolvedOrderLine[]; subtotal: string; total: string }> {
  const merged = mergeCheckoutItems(items)
  const lines: ResolvedOrderLine[] = []

  for (const it of merged) {
    const [product] = await db
      .select({
        id: schema.products.id,
        title: schema.products.title,
        basePrice: schema.products.basePrice,
      })
      .from(schema.products)
      .where(
        and(eq(schema.products.id, it.productId), eq(schema.products.tenantId, tenantId)),
      )
      .limit(1)

    if (!product) {
      throw createError({ statusCode: 400, message: '購物車含無效商品' })
    }

    const variants = await db
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, product.id))
      .orderBy(asc(schema.productVariants.skuCode))

    let variantId: string | null = it.variantId ?? null
    let unitPrice: string
    let sku: string

    if (variants.length === 0) {
      variantId = null
      unitPrice = String(product.basePrice)
      sku = '-'
    } else if (variants.length === 1 && !variantId) {
      const only = variants[0]!
      if (only.stockQuantity < it.quantity) {
        throw createError({
          statusCode: 400,
          message: `「${product.title}」庫存不足`,
        })
      }
      variantId = only.id
      unitPrice = String(only.price)
      sku = only.skuCode
    } else {
      if (!variantId) {
        throw createError({
          statusCode: 400,
          message: `商品「${product.title}」請選擇規格後再結帳`,
        })
      }
      const hit = variants.find((v) => v.id === variantId)
      if (!hit) {
        throw createError({ statusCode: 400, message: '購物車含無效的 SKU' })
      }
      unitPrice = String(hit.price)
      sku = hit.skuCode
      if (hit.stockQuantity < it.quantity) {
        throw createError({
          statusCode: 400,
          message: `「${product.title}」庫存不足`,
        })
      }
    }

    if (variantId) {
      const vrow = variants.find((v) => v.id === variantId)
      if (vrow && vrow.stockQuantity < it.quantity) {
        throw createError({
          statusCode: 400,
          message: `「${product.title}」庫存不足`,
        })
      }
    }

    const lineTotal = decimalMul(unitPrice, it.quantity)
    lines.push({
      productId: product.id,
      productVariantId: variantId,
      titleSnapshot: product.title,
      skuSnapshot: sku,
      unitPrice,
      quantity: it.quantity,
      lineTotal,
    })
  }

  const subtotal = sumDecimals(lines.map((l) => l.lineTotal))
  return { lines, subtotal, total: subtotal }
}

export type StockDecLine = { productVariantId: string | null; quantity: number }

export async function decrementStockForLines(db: ShopDb, lines: StockDecLine[]) {
  for (const line of lines) {
    if (!line.productVariantId) continue
    const [row] = await db
      .select({ stock: schema.productVariants.stockQuantity })
      .from(schema.productVariants)
      .where(eq(schema.productVariants.id, line.productVariantId))
      .limit(1)
    if (!row) continue
    const next = row.stock - line.quantity
    if (next < 0) {
      throw createError({ statusCode: 409, message: '庫存已變更，請重新整理購物車' })
    }
    const updated = await db
      .update(schema.productVariants)
      .set({ stockQuantity: next, updatedAt: new Date() })
      .where(
        and(
          eq(schema.productVariants.id, line.productVariantId),
          eq(schema.productVariants.stockQuantity, row.stock),
        ),
      )
      .returning({ id: schema.productVariants.id })
    if (!updated[0]) {
      throw createError({ statusCode: 409, message: '庫存已變更，請重新整理購物車' })
    }
  }
}
