import { z } from 'zod'

/** 商品 slug：小寫、數字、連字號（與前台 URL 相容） */
export const productSlugSchema = z
  .string()
  .trim()
  .min(1, '請填寫網址代號')
  .max(255, '網址代號過長')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '網址代號只能使用小寫英文、數字與連字號')

/** NUMERIC 欄位以字串進出 JSON，避免浮點誤差 */
export const decimalStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, '價格格式不正確（最多四位小數）')

export const adminCreateProductBodySchema = z.object({
  title: z.string().trim().min(1, '請填寫名稱').max(255),
  slug: productSlugSchema,
  description: z
    .string()
    .trim()
    .max(20000)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  basePrice: decimalStringSchema,
  imageUrls: z.array(z.string().trim().max(2000)).optional().default([]),
})

export const adminPatchProductBodySchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  slug: productSlugSchema.optional(),
  description: z
    .string()
    .trim()
    .max(20000)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  basePrice: decimalStringSchema.optional(),
  imageUrls: z.array(z.string().trim().max(2000)).optional(),
})

const catalogOptionValueSchema = z.object({
  value: z.string().trim().min(1).max(255),
  sortOrder: z.number().int().min(0).max(1_000_000).optional().default(0),
})

const catalogOptionSchema = z.object({
  name: z.string().trim().min(1).max(128),
  sortOrder: z.number().int().min(0).max(1_000_000).optional().default(0),
  values: z.array(catalogOptionValueSchema).min(1, '每個規格至少一個選項值'),
})

const catalogVariantSchema = z.object({
  skuCode: z.string().trim().min(1).max(128),
  price: decimalStringSchema,
  stockQuantity: z.number().int().min(0).max(2_147_483_647),
  imageUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  valueIndexes: z.array(z.number().int().min(0)),
})

export const adminPutProductCatalogBodySchema = z.object({
  options: z.array(catalogOptionSchema),
  variants: z.array(catalogVariantSchema),
})
