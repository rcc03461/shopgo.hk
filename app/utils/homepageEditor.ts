import type {
  HomepageBannerModuleConfig,
  HomepageDynamicModule,
  HomepageDynamicModulePropsMap,
  HomepageCategoryModuleConfig,
  HomepageFooterModuleConfig,
  HomepageImageSliderModuleConfig,
  HomepageModule,
  HomepageModuleComponentKey,
  HomepageModuleConfigMap,
  HomepageNavModuleConfig,
  HomepageProductSliderProps,
  HomepageProductsModuleConfig,
} from '../types/homepage'
import type { LandingProductCard } from '../types/landing'
import { formatHkd } from './formatHkd'

type IdFactory = (prefix: string) => string
const DEFAULT_PRODUCT_RECORD_LIMIT = 16
const MAX_PRODUCT_RECORD_LIMIT = 100
const DEFAULT_PRODUCT_GRID_COLUMNS = 4

export type HomepagePreviewProductSource = {
  id: string
  name: string
  slug: string
  priceLabel?: string
  displayPrice?: string
  originalPrice?: string | null
  hasVariants?: boolean
  variantCount?: number
  categoryIds: string[]
  coverUrl: string | null
}

const MODULE_TYPE_TO_COMPONENT: Record<HomepageModule['moduleType'], HomepageModuleComponentKey> = {
  nav: 'nav1',
  banner: 'hero3',
  image_slider: 'image_slider1',
  category: 'category_grid1',
  products: 'product_slider1',
  footer: 'footer1',
}

function toSerializableValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object') {
    return typeof value === 'function' || typeof value === 'symbol' ? undefined : value
  }

  if (seen.has(value)) return undefined
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => toSerializableValue(item, seen))
  }

  const output: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = toSerializableValue(child, seen)
    if (next !== undefined) output[key] = next
  }
  return output
}

function cloneConfigSafely<T>(value: T): T {
  try {
    return structuredClone(value)
  } catch {
    return toSerializableValue(value) as T
  }
}

function asRecord(module: HomepageModule): Record<string, any> {
  if (!module.config || typeof module.config !== 'object') {
    module.config = {} as HomepageModule['config']
  }

  return module.config as Record<string, any>
}

export function createHomepageEditorId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function toHomepagePreviewProducts(products: HomepagePreviewProductSource[]): LandingProductCard[] {
  return products.flatMap((product) => {
    const categoryIds = product.categoryIds.length ? product.categoryIds : ['']
    const displayPrice = product.displayPrice ?? product.priceLabel?.replace(/[^\d.]/g, '') ?? '0'
    return categoryIds.map((categoryId) => ({
      id: product.id,
      categoryId,
      name: product.name,
      title: product.name,
      slug: product.slug,
      priceLabel: product.priceLabel ?? formatHkd(displayPrice),
      displayPrice,
      originalPrice: product.originalPrice ?? null,
      hasVariants: product.hasVariants ?? (product.variantCount ?? 0) > 0,
      coverUrl: product.coverUrl,
      imageUrl:
        product.coverUrl
        ?? 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
    }))
  })
}

export function normalizeHomepageModuleOrder(items: HomepageModule[]) {
  return items.map((module, index) => ({ ...module, sortOrder: index }))
}

export function orderHomepageModulesBySortOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function moveHomepageModule(items: HomepageModule[], index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= items.length) return normalizeHomepageModuleOrder(items)

  const copied = [...items]
  const [item] = copied.splice(index, 1)
  if (!item) return normalizeHomepageModuleOrder(items)

  copied.splice(target, 0, item)
  return normalizeHomepageModuleOrder(copied)
}

export function ensureNavConfig(module: HomepageModule<'nav'>): HomepageNavModuleConfig {
  const config = asRecord(module)
  if (typeof config.show !== 'boolean') config.show = true
  return config as HomepageNavModuleConfig
}

export function ensureBannerConfig(module: HomepageModule<'banner'>): HomepageBannerModuleConfig {
  const config = asRecord(module)
  if (!config.hero || typeof config.hero !== 'object') config.hero = {}
  const hero = config.hero as Record<string, any>
  if (typeof hero.badge !== 'string') hero.badge = '多租戶線上商店'
  if (typeof hero.title !== 'string') hero.title = ''
  if (typeof hero.subtitle !== 'string') hero.subtitle = ''
  if (!hero.primaryCta || typeof hero.primaryCta !== 'object') hero.primaryCta = {}
  if (!hero.secondaryCta || typeof hero.secondaryCta !== 'object') hero.secondaryCta = {}
  if (typeof hero.primaryCta.label !== 'string') hero.primaryCta.label = ''
  if (typeof hero.primaryCta.to !== 'string') hero.primaryCta.to = '/'
  if (typeof hero.secondaryCta.label !== 'string') hero.secondaryCta.label = ''
  if (typeof hero.secondaryCta.to !== 'string') hero.secondaryCta.to = '/'

  return config as HomepageBannerModuleConfig
}

export function ensureCategoryConfig(module: HomepageModule<'category'>): HomepageCategoryModuleConfig {
  const config = asRecord(module)
  if (typeof config.title !== 'string') config.title = ''
  if (!Array.isArray(config.categories)) config.categories = []
  return config as HomepageCategoryModuleConfig
}

export function ensureImageSliderConfig(
  module: HomepageModule<'image_slider'>,
): HomepageImageSliderModuleConfig {
  const config = asRecord(module)
  if (typeof config.title !== 'string') config.title = ''
  if (!Array.isArray(config.slides)) config.slides = []
  config.slides = config.slides
    .filter((item: unknown) => item && typeof item === 'object')
    .map((item: any, index: number) => ({
      id: typeof item.id === 'string' && item.id.trim().length ? item.id : `slide-${index}`,
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : '',
      alt: typeof item.alt === 'string' ? item.alt : '',
      linkUrl: typeof item.linkUrl === 'string' ? item.linkUrl : '',
    }))

  if (!config.ui || typeof config.ui !== 'object') config.ui = {}
  const ui = config.ui as Record<string, any>
  if (typeof ui.autoplay !== 'boolean') ui.autoplay = false
  if (typeof ui.intervalMs !== 'number') ui.intervalMs = 4000
  if (ui.intervalMs < 1000) ui.intervalMs = 1000
  if (typeof ui.loop !== 'boolean') ui.loop = true
  return config as HomepageImageSliderModuleConfig
}

export function ensureProductsConfig(module: HomepageModule<'products'>): HomepageProductsModuleConfig {
  const config = asRecord(module)
  if (typeof config.title !== 'string') config.title = ''
  if (!Array.isArray(config.categories)) config.categories = []
  if (!Array.isArray(config.products)) config.products = []
  if (!config.source || typeof config.source !== 'object') config.source = {}
  const source = config.source as Record<string, any>
  if (source.type === 'category') {
    if (typeof source.categoryId !== 'string') source.categoryId = ''
    if (typeof source.limit !== 'number') source.limit = DEFAULT_PRODUCT_RECORD_LIMIT
    if (source.limit < 1) source.limit = 1
    if (source.limit > MAX_PRODUCT_RECORD_LIMIT) source.limit = MAX_PRODUCT_RECORD_LIMIT
    if (source.sort !== 'newest' && source.sort !== 'price_asc' && source.sort !== 'price_desc') {
      source.sort = 'newest'
    }
  } else {
    source.type = 'manual'
    source.sort = 'manual'
    if (!Array.isArray(source.productIds)) {
      source.productIds = config.products.map((item: { id: string }) => item.id)
    } else {
      source.productIds = source.productIds.filter((id: unknown) => typeof id === 'string')
    }
  }

  if (!config.ui || typeof config.ui !== 'object') config.ui = {}
  const ui = config.ui as Record<string, any>
  if (typeof ui.perView !== 'number') ui.perView = 16
  if (ui.perView < 1) ui.perView = 1
  if (ui.perView > 24) ui.perView = 24
  if (typeof ui.autoplay !== 'boolean') ui.autoplay = false
  if (typeof ui.intervalMs !== 'number') ui.intervalMs = 4000
  if (ui.intervalMs < 1000) ui.intervalMs = 1000
  if (typeof ui.loop !== 'boolean') ui.loop = false
  if (ui.displayMode !== 'grid' && ui.displayMode !== 'slider') ui.displayMode = 'slider'
  if (typeof ui.gridColumns !== 'number') ui.gridColumns = DEFAULT_PRODUCT_GRID_COLUMNS
  if (ui.gridColumns < 1) ui.gridColumns = 1
  if (ui.gridColumns > 6) ui.gridColumns = 6
  return config as HomepageProductsModuleConfig
}

export function ensureFooterConfig(module: HomepageModule<'footer'>): HomepageFooterModuleConfig {
  const config = asRecord(module)
  if (typeof config.text !== 'string') config.text = ''
  return config as HomepageFooterModuleConfig
}

export function ensureModuleConfig<T extends HomepageModule['moduleType']>(
  module: HomepageModule<T>,
): HomepageModuleConfigMap[T] {
  switch (module.moduleType) {
    case 'nav':
      return ensureNavConfig(module as HomepageModule<'nav'>) as HomepageModuleConfigMap[T]
    case 'banner':
      return ensureBannerConfig(module as HomepageModule<'banner'>) as HomepageModuleConfigMap[T]
    case 'image_slider':
      return ensureImageSliderConfig(module as HomepageModule<'image_slider'>) as HomepageModuleConfigMap[T]
    case 'category':
      return ensureCategoryConfig(module as HomepageModule<'category'>) as HomepageModuleConfigMap[T]
    case 'products':
      return ensureProductsConfig(module as HomepageModule<'products'>) as HomepageModuleConfigMap[T]
    case 'footer':
      return ensureFooterConfig(module as HomepageModule<'footer'>) as HomepageModuleConfigMap[T]
  }
}

export function addCategoryToModule(
  module: HomepageModule<'category'> | HomepageModule<'products'>,
  createId: IdFactory = createHomepageEditorId,
) {
  const config =
    module.moduleType === 'category' ? ensureCategoryConfig(module) : ensureProductsConfig(module)

  config.categories.push({
    id: createId('cat'),
    label: '新分類',
  })
}

export function removeCategoryFromModule(
  module: HomepageModule<'category'> | HomepageModule<'products'>,
  index: number,
) {
  const config =
    module.moduleType === 'category' ? ensureCategoryConfig(module) : ensureProductsConfig(module)

  config.categories.splice(index, 1)
}

export function addProductToModule(
  module: HomepageModule<'products'>,
  createId: IdFactory = createHomepageEditorId,
) {
  const config = ensureProductsConfig(module)
  const fallbackCategoryId = config.categories[0]?.id ?? createId('cat')

  if (!config.categories.some((category) => category.id === fallbackCategoryId)) {
    config.categories.push({ id: fallbackCategoryId, label: '預設分類' })
  }

  const newProduct = {
    id: createId('prd'),
    categoryId: fallbackCategoryId,
    name: '新商品',
    slug: 'new-product',
    priceLabel: 'HK$0',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
  }
  config.products.push(newProduct)
  if (config.source?.type === 'manual' && !config.source.productIds.includes(newProduct.id)) {
    config.source.productIds.push(newProduct.id)
  }
}

export function removeProductFromModule(module: HomepageModule<'products'>, index: number) {
  const config = ensureProductsConfig(module)
  const removed = config.products.splice(index, 1)[0]
  if (removed && config.source?.type === 'manual') {
    config.source.productIds = config.source.productIds.filter((id) => id !== removed.id)
  }
}

export function updateModuleConfigFromJson(module: HomepageModule, value: string) {
  try {
    module.config = JSON.parse(value) as HomepageModule['config']
    ensureModuleConfig(module)
    return null
  } catch {
    return `模組 ${module.moduleKey} JSON 格式錯誤`
  }
}

function asDynamicPropsRecord(module: HomepageDynamicModule): Record<string, any> {
  if (!module.props || typeof module.props !== 'object') {
    module.props = {} as HomepageDynamicModule['props']
  }
  return module.props as Record<string, any>
}

export function ensureDynamicModuleProps<T extends HomepageDynamicModule['component']>(
  module: HomepageDynamicModule<T>,
): HomepageDynamicModulePropsMap[T] {
  const props = asDynamicPropsRecord(module)

  switch (module.component) {
    case 'nav1':
      if (typeof props.show !== 'boolean') props.show = true
      return props as HomepageDynamicModulePropsMap[T]
    case 'hero3': {
      const hero = props.hero && typeof props.hero === 'object' ? props.hero : {}
      const primaryCta =
        hero.primaryCta && typeof hero.primaryCta === 'object' ? hero.primaryCta : {}
      const secondaryCta =
        hero.secondaryCta && typeof hero.secondaryCta === 'object' ? hero.secondaryCta : {}
      props.hero = {
        badge: typeof hero.badge === 'string' ? hero.badge : '多租戶線上商店',
        title: typeof hero.title === 'string' ? hero.title : '',
        subtitle: typeof hero.subtitle === 'string' ? hero.subtitle : '',
        primaryCta: {
          label: typeof primaryCta.label === 'string' ? primaryCta.label : '',
          to: typeof primaryCta.to === 'string' ? primaryCta.to : '/',
        },
        secondaryCta: {
          label: typeof secondaryCta.label === 'string' ? secondaryCta.label : '',
          to: typeof secondaryCta.to === 'string' ? secondaryCta.to : '/',
        },
      }
      return props as HomepageDynamicModulePropsMap[T]
    }
    case 'image_slider1': {
      if (typeof props.title !== 'string') props.title = ''
      if (!Array.isArray(props.slides)) props.slides = []
      props.slides = props.slides
        .filter((item: unknown) => item && typeof item === 'object')
        .map((item: any, index: number) => ({
          id: typeof item.id === 'string' && item.id.trim().length ? item.id : `slide-${index}`,
          imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : '',
          alt: typeof item.alt === 'string' ? item.alt : '',
          linkUrl: typeof item.linkUrl === 'string' ? item.linkUrl : '',
        }))

      const ui = props.ui && typeof props.ui === 'object' ? props.ui : {}
      props.ui = {
        autoplay: typeof ui.autoplay === 'boolean' ? ui.autoplay : false,
        intervalMs: typeof ui.intervalMs === 'number' ? Math.max(1000, ui.intervalMs) : 4000,
        loop: typeof ui.loop === 'boolean' ? ui.loop : true,
      }
      return props as HomepageDynamicModulePropsMap[T]
    }
    case 'category_grid1':
      if (typeof props.title !== 'string') props.title = ''
      if (!Array.isArray(props.categories)) props.categories = []
      return props as HomepageDynamicModulePropsMap[T]
    case 'product_slider1': {
      if (typeof props.title !== 'string') props.title = ''

      const source = props.source && typeof props.source === 'object' ? props.source : {}
      if (source.type === 'category') {
        props.source = {
          type: 'category',
          categoryId: typeof source.categoryId === 'string' ? source.categoryId : '',
          limit: typeof source.limit === 'number'
            ? Math.min(MAX_PRODUCT_RECORD_LIMIT, Math.max(1, source.limit))
            : DEFAULT_PRODUCT_RECORD_LIMIT,
          sort:
            source.sort === 'newest' || source.sort === 'price_asc' || source.sort === 'price_desc'
              ? source.sort
              : 'newest',
        }
      } else {
        props.source = {
          type: 'manual',
          productIds: Array.isArray(source.productIds)
            ? source.productIds.filter((id: unknown) => typeof id === 'string')
            : [],
          sort: 'manual',
        }
      }

      const ui = props.ui && typeof props.ui === 'object' ? props.ui : {}
      props.ui = {
        perView: typeof ui.perView === 'number' ? Math.min(24, Math.max(1, ui.perView)) : 16,
        autoplay: typeof ui.autoplay === 'boolean' ? ui.autoplay : false,
        intervalMs: typeof ui.intervalMs === 'number' ? Math.max(1000, ui.intervalMs) : 4000,
        loop: typeof ui.loop === 'boolean' ? ui.loop : false,
        displayMode: ui.displayMode === 'grid' ? 'grid' : 'slider',
        gridColumns: typeof ui.gridColumns === 'number'
          ? Math.min(6, Math.max(1, ui.gridColumns))
          : DEFAULT_PRODUCT_GRID_COLUMNS,
      }

      return props as HomepageDynamicModulePropsMap[T]
    }
    case 'footer1':
      if (typeof props.text !== 'string') props.text = ''
      return props as HomepageDynamicModulePropsMap[T]
  }
}

export function toDynamicHomepageModule(module: HomepageModule): HomepageDynamicModule {
  const component = MODULE_TYPE_TO_COMPONENT[module.moduleType]
  const dynamic: HomepageDynamicModule = {
    uid: module.moduleKey,
    component,
    sortOrder: module.sortOrder,
    isEnabled: module.isEnabled,
    props: cloneConfigSafely(module.config) as HomepageDynamicModule['props'],
    moduleKey: module.moduleKey,
    moduleType: module.moduleType,
  }

  if (component === 'product_slider1') {
    const productsConfig = ensureProductsConfig(module as HomepageModule<'products'>)
    dynamic.props = {
      title: productsConfig.title,
      source: productsConfig.source!,
      ui: productsConfig.ui!,
    } satisfies HomepageProductSliderProps
  }

  ensureDynamicModuleProps(dynamic)
  return dynamic
}

export function toDynamicHomepageModules(items: HomepageModule[]) {
  return normalizeHomepageModuleOrder(orderHomepageModulesBySortOrder(items)).map((item) => toDynamicHomepageModule(item))
}

export function normalizeDynamicHomepageModuleOrder(items: HomepageDynamicModule[]) {
  return items.map((module, index) => ({ ...module, sortOrder: index }))
}

export function moveDynamicHomepageModule(items: HomepageDynamicModule[], index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= items.length) return normalizeDynamicHomepageModuleOrder(items)
  const copied = [...items]
  const [item] = copied.splice(index, 1)
  if (!item) return normalizeDynamicHomepageModuleOrder(items)
  copied.splice(target, 0, item)
  return normalizeDynamicHomepageModuleOrder(copied)
}

export function removeDynamicHomepageModule(items: HomepageDynamicModule[], index: number) {
  if (index < 0 || index >= items.length) {
    return normalizeDynamicHomepageModuleOrder(items)
  }

  const copied = [...items]
  copied.splice(index, 1)
  return normalizeDynamicHomepageModuleOrder(copied)
}

export function addCategoryToDynamicModule(
  module: HomepageDynamicModule<'category_grid1'> | HomepageDynamicModule<'product_slider1'>,
  createId: IdFactory = createHomepageEditorId,
) {
  const props =
    module.component === 'category_grid1'
      ? ensureDynamicModuleProps(module)
      : ensureDynamicModuleProps(module as HomepageDynamicModule<'product_slider1'>)

  if (!Array.isArray((props as { categories?: unknown[] }).categories)) {
    ;(props as { categories: unknown[] }).categories = []
  }
  ;(props as { categories: Array<{ id: string; label: string }> }).categories.push({
    id: createId('cat'),
    label: '新分類',
  })
}

export function removeCategoryFromDynamicModule(
  module: HomepageDynamicModule<'category_grid1'> | HomepageDynamicModule<'product_slider1'>,
  index: number,
) {
  const props =
    module.component === 'category_grid1'
      ? ensureDynamicModuleProps(module)
      : ensureDynamicModuleProps(module as HomepageDynamicModule<'product_slider1'>)
  const categories = (props as { categories?: Array<unknown> }).categories
  if (!Array.isArray(categories)) return
  categories.splice(index, 1)
}

export function addProductToDynamicModule(
  module: HomepageDynamicModule<'product_slider1'>,
  createId: IdFactory = createHomepageEditorId,
) {
  const props = ensureDynamicModuleProps(module)
  if (!Array.isArray(props.categories)) props.categories = []
  if (!Array.isArray(props.products)) props.products = []
  const fallbackCategoryId = props.categories[0]?.id ?? createId('cat')
  if (!props.categories.some((category) => category.id === fallbackCategoryId)) {
    props.categories.push({ id: fallbackCategoryId, label: '預設分類' })
  }
  const newProduct = {
    id: createId('prd'),
    categoryId: fallbackCategoryId,
    name: '新商品',
    slug: 'new-product',
    priceLabel: 'HK$0',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
  }
  props.products.push(newProduct)
  if (props.source.type === 'manual' && !props.source.productIds.includes(newProduct.id)) {
    props.source.productIds.push(newProduct.id)
  }
}

export function removeProductFromDynamicModule(module: HomepageDynamicModule<'product_slider1'>, index: number) {
  const props = ensureDynamicModuleProps(module)
  if (!Array.isArray(props.products)) return
  const removed = props.products.splice(index, 1)[0]
  if (removed && props.source.type === 'manual') {
    props.source.productIds = props.source.productIds.filter((id) => id !== removed.id)
  }
}

export function updateDynamicModulePropsFromJson(module: HomepageDynamicModule, value: string) {
  try {
    module.props = JSON.parse(value) as HomepageDynamicModule['props']
    ensureDynamicModuleProps(module as HomepageDynamicModule<keyof HomepageDynamicModulePropsMap>)
    return null
  } catch {
    return `模組 ${module.uid} JSON 格式錯誤`
  }
}
