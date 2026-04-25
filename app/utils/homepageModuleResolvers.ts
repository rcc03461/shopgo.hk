import type {
  HomepageDynamicModule,
  HomepageProductSliderProps,
} from '../types/homepage'
import type { LandingCategory, LandingProductCard } from '~/types/landing'
import { ensureDynamicModuleProps, toDynamicHomepageModule } from './homepageEditor'

export type HomepageCatalogContext = {
  categories: LandingCategory[]
  products: LandingProductCard[]
}

export function collectHomepageProductCategoryIds(modules: HomepageDynamicModule[]) {
  const ids = new Set<string>()
  for (const module of modules) {
    if (!module.isEnabled || module.component !== 'product_slider1') continue
    const props = ensureDynamicModuleProps(module as HomepageDynamicModule<'product_slider1'>)
    if (props.source.type === 'category' && props.source.categoryId) {
      ids.add(props.source.categoryId)
    }
  }
  return [...ids]
}

function sortProducts(items: LandingProductCard[], sort: 'newest' | 'price_asc' | 'price_desc') {
  const toPrice = (value: string) => Number(value.replace(/[^\d.]/g, '')) || 0
  if (sort === 'price_asc') return [...items].sort((a, b) => toPrice(a.priceLabel) - toPrice(b.priceLabel))
  if (sort === 'price_desc') return [...items].sort((a, b) => toPrice(b.priceLabel) - toPrice(a.priceLabel))
  return [...items]
}

export function resolveProductSliderProducts(
  props: HomepageProductSliderProps,
  context: HomepageCatalogContext,
): LandingProductCard[] {
  const productPool = context.products

  if (props.source.type === 'manual') {
    const sourceMap = new Map(productPool.map((item) => [item.id, item]))
    return props.source.productIds
      .map((id) => sourceMap.get(id))
      .filter((item): item is LandingProductCard => Boolean(item))
  }

  const source = props.source
  const byCategory = productPool.filter((item) => item.categoryId === source.categoryId)
  return sortProducts(byCategory, source.sort).slice(0, source.limit)
}

export function resolveModuleProps(module: HomepageDynamicModule, context: HomepageCatalogContext) {
  if (module.component !== 'product_slider1') return module.props
  const props = ensureDynamicModuleProps(module as HomepageDynamicModule<'product_slider1'>)
  return {
    ...props,
    categories: context.categories,
    products: resolveProductSliderProducts(props, context),
  }
}

export function resolveDynamicHomepageModules(
  modules: Array<HomepageDynamicModule | any>,
  context: HomepageCatalogContext,
): HomepageDynamicModule[] {
  return modules.map((item) => {
    const dynamic = 'component' in item ? item : toDynamicHomepageModule(item)
    return {
      ...dynamic,
      props: resolveModuleProps(dynamic, context),
    }
  })
}
