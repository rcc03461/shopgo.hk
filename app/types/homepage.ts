import type { LandingCategory, LandingHero, LandingProductCard } from './landing'

export const HOMEPAGE_MODULE_TYPES = ['nav', 'banner', 'image_slider', 'category', 'products', 'footer'] as const
export type HomepageModuleType = (typeof HOMEPAGE_MODULE_TYPES)[number]

export const HOMEPAGE_VERSION_STATES = ['draft', 'published'] as const
export type HomepageVersionState = (typeof HOMEPAGE_VERSION_STATES)[number]

export type HomepageNavModuleConfig = {
  show: boolean
}

export type HomepageBannerModuleConfig = {
  hero: LandingHero
}

export type HomepageCategoryModuleConfig = {
  title: string
  categories: LandingCategory[]
}

export type HomepageImageSlide = {
  id: string
  imageUrl: string
  alt?: string
  linkUrl?: string
}

export type HomepageImageSliderModuleConfig = {
  title: string
  slides: HomepageImageSlide[]
  ui: {
    autoplay: boolean
    intervalMs: number
    loop: boolean
  }
}

export type HomepageProductsModuleConfig = {
  title: string
  categories: LandingCategory[]
  products: LandingProductCard[]
  source?: HomepageProductSliderSource
  ui?: HomepageProductSliderProps['ui']
}

export type HomepageFooterModuleConfig = {
  text: string
}

export type HomepageModuleConfigMap = {
  nav: HomepageNavModuleConfig
  banner: HomepageBannerModuleConfig
  image_slider: HomepageImageSliderModuleConfig
  category: HomepageCategoryModuleConfig
  products: HomepageProductsModuleConfig
  footer: HomepageFooterModuleConfig
}

export type HomepageModule<T extends HomepageModuleType = HomepageModuleType> = {
  moduleKey: string
  moduleType: T
  sortOrder: number
  isEnabled: boolean
  config: HomepageModuleConfigMap[T] | Record<string, unknown>
}

export const HOMEPAGE_COMPONENT_KEYS = ['nav1', 'hero3', 'image_slider1', 'category_grid1', 'product_slider1', 'footer1'] as const
export type HomepageModuleComponentKey = (typeof HOMEPAGE_COMPONENT_KEYS)[number]

export const HOMEPAGE_PRODUCT_SOURCE_SORTS = ['manual', 'newest', 'price_asc', 'price_desc'] as const
export type HomepageProductSourceSort = (typeof HOMEPAGE_PRODUCT_SOURCE_SORTS)[number]

export type HomepageProductSliderSource =
  | {
      type: 'manual'
      productIds: string[]
      sort: 'manual'
    }
  | {
      type: 'category'
      categoryId: string
      limit: number
      sort: Exclude<HomepageProductSourceSort, 'manual'>
    }

export type HomepageProductSliderProps = {
  title: string
  source: HomepageProductSliderSource
  ui: {
    perView: number
    autoplay: boolean
    intervalMs: number
    loop: boolean
  }
  // 保留舊資料欄位，讓 API/舊前台可以漸進式遷移。
  categories?: LandingCategory[]
  products?: LandingProductCard[]
}

export type HomepageDynamicModulePropsMap = {
  nav1: HomepageNavModuleConfig
  hero3: HomepageBannerModuleConfig
  image_slider1: HomepageImageSliderModuleConfig
  category_grid1: HomepageCategoryModuleConfig
  product_slider1: HomepageProductSliderProps
  footer1: HomepageFooterModuleConfig
}

export type HomepageDynamicModule<T extends HomepageModuleComponentKey = HomepageModuleComponentKey> = {
  uid: string
  component: T
  sortOrder: number
  isEnabled: boolean
  props: HomepageDynamicModulePropsMap[T]
  // 與既有欄位相容（用於儲存/回傳舊 schema）
  moduleKey?: string
  moduleType?: HomepageModuleType
  config?: HomepageModuleConfigMap[HomepageModuleType]
}
