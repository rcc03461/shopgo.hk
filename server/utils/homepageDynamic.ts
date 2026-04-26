import type { HomepageDynamicModule, HomepageModule, HomepageModuleComponentKey } from '../../app/types/homepage'

const componentToModuleType: Record<HomepageModuleComponentKey, HomepageModule['moduleType']> = {
  nav1: 'nav',
  hero3: 'banner',
  image_slider1: 'image_slider',
  category_grid1: 'category',
  product_slider1: 'products',
  footer1: 'footer',
}

const moduleTypeToComponent: Record<HomepageModule['moduleType'], HomepageModuleComponentKey> = {
  nav: 'nav1',
  banner: 'hero3',
  image_slider: 'image_slider1',
  category: 'category_grid1',
  products: 'product_slider1',
  footer: 'footer1',
}

function orderBySortOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}

function normalizeProductSliderUi(ui: unknown) {
  const source = ui && typeof ui === 'object' ? ui as Record<string, unknown> : {}
  return {
    perView: typeof source.perView === 'number' ? Math.min(24, Math.max(1, source.perView)) : 16,
    autoplay: typeof source.autoplay === 'boolean' ? source.autoplay : false,
    intervalMs: typeof source.intervalMs === 'number' ? Math.max(1000, source.intervalMs) : 4000,
    loop: typeof source.loop === 'boolean' ? source.loop : false,
    displayMode: source.displayMode === 'grid' ? 'grid' as const : 'slider' as const,
    gridColumns: typeof source.gridColumns === 'number' ? Math.min(6, Math.max(1, source.gridColumns)) : 4,
  }
}

export function dynamicToLegacyModules(items: HomepageDynamicModule[]): HomepageModule[] {
  return orderBySortOrder(items).map((item, index) => {
    const moduleType = componentToModuleType[item.component]
    const moduleKey = item.moduleKey ?? item.uid

    if (item.component === 'product_slider1') {
      const props = item.props as Record<string, unknown>
      return {
        moduleKey,
        moduleType,
        sortOrder: index,
        isEnabled: item.isEnabled,
        config: {
          title: (props.title as string | undefined) ?? '',
          categories: Array.isArray(props.categories) ? props.categories : [],
          products: Array.isArray(props.products) ? props.products : [],
          source: props.source ?? { type: 'manual', productIds: [], sort: 'manual' },
          ui: normalizeProductSliderUi(props.ui),
        },
      }
    }

    return {
      moduleKey,
      moduleType,
      sortOrder: index,
      isEnabled: item.isEnabled,
      config: item.props as HomepageModule['config'],
    }
  })
}

export function legacyToDynamicModules(items: HomepageModule[]): HomepageDynamicModule[] {
  return orderBySortOrder(items).map((item, index) => {
    const component = moduleTypeToComponent[item.moduleType]
    if (component === 'product_slider1') {
      const productsConfig = item.config as Record<string, unknown>
      const props: HomepageDynamicModule<'product_slider1'>['props'] = {
        title: (productsConfig.title as string | undefined) ?? '',
        source: (productsConfig.source as HomepageDynamicModule<'product_slider1'>['props']['source'] | undefined) ?? {
          type: 'manual',
          productIds: [],
          sort: 'manual',
        },
        ui: normalizeProductSliderUi(productsConfig.ui),
      }
      return {
        uid: item.moduleKey,
        component,
        sortOrder: index,
        isEnabled: item.isEnabled,
        props,
        moduleKey: item.moduleKey,
        moduleType: item.moduleType,
      }
    }

    return {
      uid: item.moduleKey,
      component,
      sortOrder: index,
      isEnabled: item.isEnabled,
      props: item.config as HomepageDynamicModule['props'],
      moduleKey: item.moduleKey,
      moduleType: item.moduleType,
    }
  })
}
