import { z } from 'zod'

export const pageSlugSchema = z
  .string()
  .trim()
  .min(1, '請填寫網址代號')
  .max(255, '網址代號過長')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '網址代號只能使用小寫英文、數字與連字號')

export const pageStatusSchema = z.enum(['draft', 'published', 'archived'], {
  message: '狀態不正確',
})

const nullableText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null))

export const adminCreatePageBodySchema = z.object({
  title: z.string().trim().min(1, '請填寫標題').max(255),
  slug: pageSlugSchema,
  excerpt: nullableText,
  contentMarkdown: z.string().max(200_000).default(''),
  status: pageStatusSchema.default('draft'),
  seoTitle: nullableText,
  seoDescription: nullableText,
})

export const adminPatchPageBodySchema = z.object({
  title: z.string().trim().min(1, '請填寫標題').max(255).optional(),
  slug: pageSlugSchema.optional(),
  excerpt: nullableText,
  contentMarkdown: z.string().max(200_000).optional(),
  status: pageStatusSchema.optional(),
  seoTitle: nullableText,
  seoDescription: nullableText,
})
