// @ts-ignore Bun test types are not configured in this repository yet.
import { describe, expect, test } from 'bun:test'
import { homepageModuleSchema } from './homepageSchemas'

describe('homepageModuleSchema（發佈前驗證）', () => {
  test('products 模組可僅含動態編輯器儲存的 title + source + ui（無 categories/products 陣列）', () => {
    const result = homepageModuleSchema.safeParse({
      moduleKey: 'main-products',
      moduleType: 'products',
      sortOrder: 1,
      isEnabled: true,
      config: {
        title: '精選商品',
        source: { type: 'manual', productIds: [], sort: 'manual' },
        ui: {
          perView: 4,
          autoplay: false,
          intervalMs: 4000,
          loop: false,
          displayMode: 'grid',
          gridColumns: 4,
        },
      },
    })

    expect(result.success).toBe(true)
  })
})
