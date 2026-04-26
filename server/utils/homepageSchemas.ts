import { z } from 'zod'

export const homepageModuleTypeSchema = z.enum(['nav', 'banner', 'image_slider', 'category', 'products', 'footer'])
export const homepageVersionStateSchema = z.enum(['draft', 'published'])

/**
 * 支援兩種圖片來源：
 * - 完整 URL（http/https）
 * - 站內相對路徑（例：/uploads/tenant-id/file.jpg）
 */
const publicAssetUrlSchema = z.string().trim().refine((value) => {
  if (!value) return false
  if (value.startsWith('/')) return true
  const lower = value.toLowerCase()
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) return false
  try {
    // 僅檢查 URL 格式，不限制 host
    new URL(value)
    return true
  } catch {
    return false
  }
}, '請輸入有效圖片網址（http/https 或 / 開頭路徑）')

const navConfigSchema = z.object({
  show: z.boolean().default(true),
})

const bannerConfigSchema = z.object({
  hero: z.object({
    badge: z.string().trim().min(1).max(60),
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().min(1).max(500),
    primaryCta: z.object({
      label: z.string().trim().min(1).max(40),
      to: z.string().trim().min(1).max(255),
    }),
    secondaryCta: z.object({
      label: z.string().trim().min(1).max(40),
      to: z.string().trim().min(1).max(255),
    }),
  }),
})

const categoryConfigSchema = z.object({
  title: z.string().trim().min(1).max(120),
  categories: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      label: z.string().trim().min(1).max(60),
    }),
  ).max(12).default([]),
})

const imageSliderConfigSchema = z.object({
  title: z.string().trim().min(0).max(120),
  slides: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      imageUrl: publicAssetUrlSchema,
      alt: z.string().trim().max(200).optional(),
      linkUrl: z.string().trim().max(255).optional(),
    }),
  ).max(20).default([]),
  ui: z.object({
    autoplay: z.boolean(),
    intervalMs: z.number().int().min(1000).max(120000),
    loop: z.boolean(),
  }),
})

/** 與動態編輯器儲存格式相容：可僅含 title + source + ui，categories/products 由預設補齊 */
const productsConfigSchema = z.object({
  title: z.string().trim().min(0).max(120),
  categories: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      label: z.string().trim().min(1).max(60),
    }),
  ).max(12).default([]),
  products: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      categoryId: z.string().trim().min(1).max(80),
      name: z.string().trim().min(1).max(120),
      slug: z.string().trim().min(1).max(255),
      priceLabel: z.string().trim().min(1).max(40),
      imageUrl: publicAssetUrlSchema,
    }),
  ).max(60).default([]),
})

const footerConfigSchema = z.object({
  text: z.string().trim().min(1).max(200),
})

export const homepageModuleSchema = z.object({
  moduleKey: z.string().trim().min(1).max(64),
  moduleType: homepageModuleTypeSchema,
  sortOrder: z.number().int().min(0).max(1000),
  isEnabled: z.boolean(),
  config: z.record(z.string(), z.unknown()),
}).superRefine((module, ctx) => {
  const result = (() => {
    if (module.moduleType === 'nav') return navConfigSchema.safeParse(module.config)
    if (module.moduleType === 'banner') return bannerConfigSchema.safeParse(module.config)
    if (module.moduleType === 'image_slider') return imageSliderConfigSchema.safeParse(module.config)
    if (module.moduleType === 'category') return categoryConfigSchema.safeParse(module.config)
    if (module.moduleType === 'products') return productsConfigSchema.safeParse(module.config)
    return footerConfigSchema.safeParse(module.config)
  })()

  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error.issues[0]?.message ?? `模組 ${module.moduleKey} 設定不正確`,
      path: ['config'],
    })
  }
})

export const homepageModulePutBodySchema = z.object({
  items: z.array(homepageModuleSchema).min(1, '至少需要一個首頁模組'),
})

const dynamicProductSourceSchema = z.union([
  z.object({
    type: z.literal('manual'),
    productIds: z.array(z.string().trim().min(1).max(80)).max(120),
    sort: z.literal('manual'),
  }),
  z.object({
    type: z.literal('category'),
    categoryId: z.string().trim().min(1).max(80),
    limit: z.number().int().min(1).max(100),
    sort: z.enum(['newest', 'price_asc', 'price_desc']),
  }),
])

const dynamicModuleSchema = z.object({
  uid: z.string().trim().min(1).max(64),
  component: z.enum(['nav1', 'hero3', 'image_slider1', 'category_grid1', 'product_slider1', 'footer1']),
  sortOrder: z.number().int().min(0).max(1000),
  isEnabled: z.boolean(),
  props: z.record(z.string(), z.unknown()),
  moduleKey: z.string().trim().min(1).max(64).optional(),
  moduleType: homepageModuleTypeSchema.optional(),
}).superRefine((module, ctx) => {
  if (module.component === 'image_slider1') {
    const result = imageSliderConfigSchema.safeParse(module.props)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error.issues[0]?.message ?? `模組 ${module.uid} 設定不正確`,
        path: ['props'],
      })
    }
  }

  if (module.component === 'product_slider1') {
    const sliderSchema = z.object({
      title: z.string().trim().min(0).max(120),
      categories: z.array(
        z.object({
          id: z.string().trim().min(1).max(80),
          label: z.string().trim().min(1).max(60),
        }),
      ).max(12).optional(),
      products: z.array(
        z.object({
          id: z.string().trim().min(1).max(80),
          categoryId: z.string().trim().min(1).max(80),
          name: z.string().trim().min(1).max(120),
          slug: z.string().trim().min(1).max(255),
          priceLabel: z.string().trim().min(1).max(40),
          imageUrl: publicAssetUrlSchema,
        }),
      ).max(120).optional(),
      source: dynamicProductSourceSchema,
      ui: z.object({
        perView: z.number().int().min(1).max(24),
        autoplay: z.boolean(),
        intervalMs: z.number().int().min(1000).max(120000),
        loop: z.boolean(),
        displayMode: z.enum(['slider', 'grid']),
        gridColumns: z.number().int().min(1).max(6),
      }),
    })
    const result = sliderSchema.safeParse(module.props)
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error.issues[0]?.message ?? `模組 ${module.uid} 設定不正確`,
        path: ['props'],
      })
    }
  }
})

export const homepageDynamicModulePutBodySchema = z.object({
  items: z.array(dynamicModuleSchema).min(1, '至少需要一個首頁模組'),
})

