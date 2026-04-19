import { z } from 'zod'

export const storeCheckoutItemSchema = z.object({
  productId: z.string().uuid('商品 id 格式不正確'),
  variantId: z.union([z.string().uuid(), z.null()]).optional(),
  quantity: z.number().int().min(1).max(99),
})

export const storeCheckoutBodySchema = z.object({
  provider: z.enum(['stripe', 'paypal']),
  customerEmail: z
    .union([z.string().email(), z.literal('')])
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  items: z.array(storeCheckoutItemSchema).min(1).max(50),
})

export type StoreCheckoutBody = z.infer<typeof storeCheckoutBodySchema>
