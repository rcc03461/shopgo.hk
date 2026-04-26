// @ts-ignore Bun test types are not configured in this repository yet.
import { describe, expect, test } from 'bun:test'
import type { HomepageDynamicModule, HomepageModule } from '../types/homepage'
import {
  addCategoryToModule,
  addProductToModule,
  ensureDynamicModuleProps,
  ensureModuleConfig,
  moveHomepageModule,
  removeDynamicHomepageModule,
  toDynamicHomepageModule,
  toDynamicHomepageModules,
  toHomepagePreviewProducts,
  updateModuleConfigFromJson,
} from './homepageEditor'
import {
  collectHomepageProductCategoryIds,
  getHomepageProductCategoryPageSizes,
  resolveProductSliderProducts,
} from './homepageModuleResolvers'

function createModule<T extends HomepageModule['moduleType']>(
  moduleType: T,
  config: HomepageModule<T>['config'],
): HomepageModule<T> {
  return {
    moduleKey: `${moduleType}-module`,
    moduleType,
    sortOrder: 0,
    isEnabled: true,
    config,
  }
}

describe('moveHomepageModule', () => {
  test('重新排序后会同步更新 sortOrder', () => {
    const items: HomepageModule[] = [
      createModule('nav', { show: true }),
      createModule('banner', {
        hero: {
          badge: 'badge',
          title: 'title',
          subtitle: 'subtitle',
          primaryCta: { label: 'buy', to: '/' },
          secondaryCta: { label: 'more', to: '/more' },
        },
      }),
      createModule('footer', { text: 'footer' }),
    ]

    const moved = moveHomepageModule(items, 0, 1)

    expect(moved.map((item) => item.moduleType)).toEqual(['banner', 'nav', 'footer'])
    expect(moved.map((item) => item.sortOrder)).toEqual([0, 1, 2])
  })

  test('超出边界时保持原顺序，仅重新整理 sortOrder', () => {
    const items: HomepageModule[] = [
      { ...createModule('nav', { show: true }), sortOrder: 3 },
      { ...createModule('footer', { text: 'footer' }), sortOrder: 8 },
    ]

    const moved = moveHomepageModule(items, 0, -1)

    expect(moved.map((item) => item.moduleType)).toEqual(['nav', 'footer'])
    expect(moved.map((item) => item.sortOrder)).toEqual([0, 1])
  })
})

describe('collectHomepageProductCategoryIds', () => {
  test('只收集啟用中 category source 的 product_slider1 分類', () => {
    const ids = collectHomepageProductCategoryIds([
      {
        uid: 'nav',
        component: 'nav1',
        sortOrder: 0,
        isEnabled: true,
        props: { show: true },
      },
      {
        uid: 'featured',
        component: 'product_slider1',
        sortOrder: 1,
        isEnabled: true,
        props: {
          title: '精選',
          source: { type: 'category', categoryId: 'cat-1', limit: 4, sort: 'newest' },
          ui: { perView: 4, autoplay: false, intervalMs: 4000, loop: false },
        },
      },
      {
        uid: 'manual',
        component: 'product_slider1',
        sortOrder: 2,
        isEnabled: true,
        props: {
          title: '手選',
          source: { type: 'manual', productIds: ['p1'], sort: 'manual' },
          ui: { perView: 4, autoplay: false, intervalMs: 4000, loop: false },
        },
      },
      {
        uid: 'disabled',
        component: 'product_slider1',
        sortOrder: 3,
        isEnabled: false,
        props: {
          title: '停用',
          source: { type: 'category', categoryId: 'cat-2', limit: 4, sort: 'newest' },
          ui: { perView: 4, autoplay: false, intervalMs: 4000, loop: false },
        },
      },
      {
        uid: 'duplicate',
        component: 'product_slider1',
        sortOrder: 4,
        isEnabled: true,
        props: {
          title: '重複',
          source: { type: 'category', categoryId: 'cat-1', limit: 8, sort: 'newest' },
          ui: { perView: 4, autoplay: false, intervalMs: 4000, loop: false },
        },
      },
    ])

    expect(ids).toEqual(['cat-1'])
  })
})

describe('ensureModuleConfig', () => {
  test('会为各类模组补齐默认配置', () => {
    const navModule = createModule('nav', {} as HomepageModule<'nav'>['config'])
    const bannerModule = createModule('banner', {} as HomepageModule<'banner'>['config'])
    const categoryModule = createModule('category', {} as HomepageModule<'category'>['config'])
    const productsModule = createModule('products', {} as HomepageModule<'products'>['config'])
    const footerModule = createModule('footer', {} as HomepageModule<'footer'>['config'])

    expect(ensureModuleConfig(navModule)).toEqual({ show: true })
    expect(ensureModuleConfig(bannerModule)).toEqual({
      hero: {
        badge: '多租戶線上商店',
        title: '',
        subtitle: '',
        primaryCta: { label: '', to: '/' },
        secondaryCta: { label: '', to: '/' },
      },
    })
    expect(ensureModuleConfig(categoryModule)).toEqual({
      title: '',
      categories: [],
    })
    expect(ensureModuleConfig(productsModule)).toEqual({
      title: '',
      categories: [],
      products: [],
      source: {
        type: 'manual',
        productIds: [],
        sort: 'manual',
      },
      ui: {
        perView: 16,
        autoplay: false,
        intervalMs: 4000,
        loop: false,
        displayMode: 'slider',
        gridColumns: 4,
      },
    })
    expect(ensureModuleConfig(footerModule)).toEqual({ text: '' })
  })
})

describe('preview product mapping', () => {
  test('保留後台商品價格欄位，讓預覽與正式首頁卡片一致', () => {
    const result = toHomepagePreviewProducts([
      {
        id: 'p1',
        name: '商品 A',
        slug: 'product-a',
        priceLabel: 'HK$160.0000',
        displayPrice: '160.0000',
        originalPrice: '180.0000',
        hasVariants: true,
        categoryIds: ['cat-a'],
        coverUrl: 'cover.jpg',
      },
    ])

    expect(result).toEqual([
      {
        id: 'p1',
        categoryId: 'cat-a',
        name: '商品 A',
        title: '商品 A',
        slug: 'product-a',
        priceLabel: 'HK$160.0000',
        displayPrice: '160.0000',
        originalPrice: '180.0000',
        hasVariants: true,
        coverUrl: 'cover.jpg',
        imageUrl: 'cover.jpg',
      },
    ])
  })
})

describe('module list mutations', () => {
  test('为分类模组新增分类', () => {
    const module = createModule('category', { title: '', categories: [] })

    addCategoryToModule(module, () => 'cat-fixed')

    expect(module.config.categories).toEqual([{ id: 'cat-fixed', label: '新分類' }])
  })

  test('为商品模组新增商品时会自动建立预设分类', () => {
    const module = createModule('products', { title: '', categories: [], products: [] })
    let counter = 0
    const nextId = () => `id-${++counter}`

    addProductToModule(module, nextId)

    expect(module.config.categories).toEqual([{ id: 'id-1', label: '預設分類' }])
    expect(module.config.products).toEqual([
      {
        id: 'id-2',
        categoryId: 'id-1',
        name: '新商品',
        slug: 'new-product',
        priceLabel: 'HK$0',
        imageUrl:
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
      },
    ])
    expect(module.config.source).toEqual({
      type: 'manual',
      productIds: ['id-2'],
      sort: 'manual',
    })
  })
})

describe('updateModuleConfigFromJson', () => {
  test('合法但不完整的 Banner JSON 会被补齐默认值', () => {
    const module = createModule('banner', {
      hero: {
        badge: 'old',
        title: 'old',
        subtitle: 'old',
        primaryCta: { label: 'old', to: '/old' },
        secondaryCta: { label: 'old', to: '/old' },
      },
    })

    const error = updateModuleConfigFromJson(module, '{"hero":{"title":"新主標題"}}')

    expect(error).toBeNull()
    expect(module.config).toEqual({
      hero: {
        badge: '多租戶線上商店',
        title: '新主標題',
        subtitle: '',
        primaryCta: { label: '', to: '/' },
        secondaryCta: { label: '', to: '/' },
      },
    })
  })

  test('JSON 非法时返回错误讯息', () => {
    const module = createModule('footer', { text: '' })

    const error = updateModuleConfigFromJson(module, '{bad json}')

    expect(error).toBe('模組 footer-module JSON 格式錯誤')
    expect(module.config).toEqual({ text: '' })
  })
})

describe('dynamic module conversion', () => {
  test('刪除 dynamic module 後會重排 sortOrder', () => {
    const modules: HomepageDynamicModule[] = [
      {
        uid: 'a',
        component: 'nav1' as const,
        sortOrder: 0,
        isEnabled: true,
        props: { show: true },
      },
      {
        uid: 'b',
        component: 'hero3' as const,
        sortOrder: 1,
        isEnabled: true,
        props: {
          hero: {
            badge: '',
            title: '',
            subtitle: '',
            primaryCta: { label: '', to: '/' },
            secondaryCta: { label: '', to: '/' },
          },
        },
      },
      {
        uid: 'c',
        component: 'footer1' as const,
        sortOrder: 2,
        isEnabled: true,
        props: { text: '' },
      },
    ]

    const next = removeDynamicHomepageModule(modules, 1)
    expect(next.map((item) => item.uid)).toEqual(['a', 'c'])
    expect(next.map((item) => item.sortOrder)).toEqual([0, 1])
  })

  test('刪除索引超出範圍時只會正規化 sortOrder', () => {
    const modules: HomepageDynamicModule[] = [
      {
        uid: 'a',
        component: 'nav1' as const,
        sortOrder: 5,
        isEnabled: true,
        props: { show: true },
      },
      {
        uid: 'c',
        component: 'footer1' as const,
        sortOrder: 9,
        isEnabled: true,
        props: { text: '' },
      },
    ]

    const next = removeDynamicHomepageModule(modules, 99)
    expect(next.map((item) => item.uid)).toEqual(['a', 'c'])
    expect(next.map((item) => item.sortOrder)).toEqual([0, 1])
  })

  test('image_slider module 會轉成 image_slider1 並保留 slides', () => {
    const legacySlider = createModule('image_slider' as HomepageModule['moduleType'], {
      title: '首頁輪播',
      slides: [
        {
          id: 's1',
          imageUrl: 'https://example.com/a.jpg',
          alt: '圖一',
          linkUrl: '/products/a',
        },
      ],
      ui: {
        autoplay: true,
        intervalMs: 3000,
        loop: true,
      },
    } as any)

    const dynamic = toDynamicHomepageModule(legacySlider)

    expect(dynamic.component).toBe('image_slider1')
    expect(dynamic.props).toEqual({
      title: '首頁輪播',
      slides: [
        {
          id: 's1',
          imageUrl: 'https://example.com/a.jpg',
          alt: '圖一',
          linkUrl: '/products/a',
        },
      ],
      ui: {
        autoplay: true,
        intervalMs: 3000,
        loop: true,
      },
    })
  })

  test('批次轉換時會依 sortOrder 排列，避免後台與首頁展示順序不同', () => {
    const modules: HomepageModule[] = [
      { ...createModule('footer', { text: 'footer' }), moduleKey: 'footer', sortOrder: 2 },
      {
        ...createModule('banner', {
          hero: {
            badge: 'badge',
            title: 'title',
            subtitle: 'subtitle',
            primaryCta: { label: 'buy', to: '/' },
            secondaryCta: { label: 'more', to: '/more' },
          },
        }),
        moduleKey: 'banner',
        sortOrder: 0,
      },
      { ...createModule('category', { title: 'categories', categories: [] }), moduleKey: 'category', sortOrder: 1 },
    ]

    const dynamic = toDynamicHomepageModules(modules)

    expect(dynamic.map((item) => item.uid)).toEqual(['banner', 'category', 'footer'])
    expect(dynamic.map((item) => item.sortOrder)).toEqual([0, 1, 2])
  })

  test('products module 會轉成 product_slider1 並補齊預設 source/ui', () => {
    const legacyProducts = createModule('products', {
      title: '精選商品',
      categories: [{ id: 'c1', label: '分類1' }],
      products: [
        {
          id: 'p1',
          categoryId: 'c1',
          name: '商品1',
          slug: 'p1',
          priceLabel: 'HK$10',
          imageUrl: 'https://example.com/1.jpg',
        },
      ],
    })

    const dynamic = toDynamicHomepageModule(legacyProducts)

    expect(dynamic.component).toBe('product_slider1')
    expect(dynamic.props).toEqual({
      title: '精選商品',
      source: {
        type: 'manual',
        productIds: ['p1'],
        sort: 'manual',
      },
      ui: {
        perView: 16,
        autoplay: false,
        intervalMs: 4000,
        loop: false,
        displayMode: 'slider',
        gridColumns: 4,
      },
    })
  })

  test('dynamic props 缺漏時會由 ensureDynamicModuleProps 補齊', () => {
    const module = {
      uid: 'm1',
      component: 'product_slider1' as const,
      sortOrder: 0,
      isEnabled: true,
      props: {
        source: {
          type: 'category',
          categoryId: 'c1',
        },
      },
    } as any

    const props = ensureDynamicModuleProps(module)

    expect(props).toEqual({
      title: '',
      source: {
        type: 'category',
        categoryId: 'c1',
        limit: 16,
        sort: 'newest',
      },
      ui: {
        perView: 16,
        autoplay: false,
        intervalMs: 4000,
        loop: false,
        displayMode: 'slider',
        gridColumns: 4,
      },
    })
  })

  test('image_slider1 props 缺漏時會補齊預設值', () => {
    const module = {
      uid: 'm-image-slider',
      component: 'image_slider1' as const,
      sortOrder: 0,
      isEnabled: true,
      props: {
        slides: [
          {
            imageUrl: 'https://example.com/x.jpg',
          },
        ],
      },
    } as any

    const props = ensureDynamicModuleProps(module)
    expect(props).toEqual({
      title: '',
      slides: [
        {
          id: 'slide-0',
          imageUrl: 'https://example.com/x.jpg',
          alt: '',
          linkUrl: '',
        },
      ],
      ui: {
        autoplay: false,
        intervalMs: 4000,
        loop: true,
      },
    })
  })

  test('遇到不可 clone 的值時不應拋錯', () => {
    const legacyBanner = createModule('banner', {
      hero: {
        badge: 'x',
        title: 'y',
        subtitle: 'z',
        primaryCta: { label: 'go', to: '/' },
        secondaryCta: { label: 'more', to: '/more' },
      },
      onClick: () => {},
    } as any)

    const dynamic = toDynamicHomepageModule(legacyBanner)
    expect(dynamic.component).toBe('hero3')
    expect((dynamic.props as any).hero.title).toBe('y')
  })
})

describe('product slider resolver', () => {
  const products = [
    {
      id: 'p1',
      categoryId: 'c1',
      name: 'A',
      slug: 'a',
      priceLabel: 'HK$20',
      imageUrl: 'a.jpg',
    },
    {
      id: 'p2',
      categoryId: 'c1',
      name: 'B',
      slug: 'b',
      priceLabel: 'HK$10',
      imageUrl: 'b.jpg',
    },
  ]

  test('manual 會依 productIds 順序回傳', () => {
    const result = resolveProductSliderProducts(
      {
        title: 'x',
        source: { type: 'manual', productIds: ['p2', 'p1'], sort: 'manual' },
        ui: { perView: 4, autoplay: false, intervalMs: 4000, loop: false, displayMode: 'slider', gridColumns: 4 },
      },
      { categories: [], products },
    )
    expect(result.map((item) => item.id)).toEqual(['p2', 'p1'])
  })

  test('category 可依價格排序並限制數量', () => {
    const result = resolveProductSliderProducts(
      {
        title: 'x',
        source: { type: 'category', categoryId: 'c1', limit: 1, sort: 'price_asc' },
        ui: { perView: 4, autoplay: false, intervalMs: 4000, loop: false, displayMode: 'slider', gridColumns: 4 },
      },
      { categories: [], products },
    )
    expect(result.map((item) => item.id)).toEqual(['p2'])
  })

  test('會按分類取得最大的 product_slider1 records 數量', () => {
    const result = getHomepageProductCategoryPageSizes([
      {
        uid: 'm1',
        component: 'product_slider1',
        sortOrder: 0,
        isEnabled: true,
        props: {
          title: 'A',
          source: { type: 'category', categoryId: 'c1', limit: 12, sort: 'newest' },
          ui: { perView: 4, autoplay: false, intervalMs: 4000, loop: false, displayMode: 'grid', gridColumns: 4 },
        },
      },
      {
        uid: 'm2',
        component: 'product_slider1',
        sortOrder: 1,
        isEnabled: true,
        props: {
          title: 'B',
          source: { type: 'category', categoryId: 'c1', limit: 24, sort: 'newest' },
          ui: { perView: 4, autoplay: false, intervalMs: 4000, loop: false, displayMode: 'slider', gridColumns: 4 },
        },
      },
      {
        uid: 'm3',
        component: 'product_slider1',
        sortOrder: 2,
        isEnabled: false,
        props: {
          title: 'C',
          source: { type: 'category', categoryId: 'c2', limit: 32, sort: 'newest' },
          ui: { perView: 4, autoplay: false, intervalMs: 4000, loop: false, displayMode: 'slider', gridColumns: 4 },
        },
      },
    ])

    expect(Object.fromEntries(result)).toEqual({ c1: 24 })
  })
})
