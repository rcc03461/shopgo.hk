import { clearNuxtData } from '#app'
import type { HomepageDynamicModule, HomepageModule, HomepageModuleComponentKey } from '../types/homepage'
import {
  addCategoryToDynamicModule,
  addProductToDynamicModule,
  moveDynamicHomepageModule,
  removeDynamicHomepageModule,
  normalizeDynamicHomepageModuleOrder,
  orderHomepageModulesBySortOrder,
  removeCategoryFromDynamicModule,
  removeProductFromDynamicModule,
  toDynamicHomepageModules,
  toHomepagePreviewProducts,
  updateDynamicModulePropsFromJson,
} from '../utils/homepageEditor'
import { resolveDynamicHomepageModules } from '../utils/homepageModuleResolvers'

type HomepageModulesResponse = {
  items: HomepageModule[]
  dynamicItems?: HomepageDynamicModule[]
  hasPublished: boolean
}

type AdminCategoryOption = { id: string; label: string }
type AdminProductOption = {
  id: string
  name: string
  slug: string
  priceLabel: string
  displayPrice: string
  originalPrice: string | null
  hasVariants: boolean
  categoryIds: string[]
  coverUrl: string | null
}

export function useHomepageEditor() {
  const tenantSlug = useState<string | null>('oshop-tenant-slug')
  const requestFetch = useRequestFetch()
  const saving = ref(false)
  const publishing = ref(false)
  const saveError = ref<string | null>(null)
  const draftItems = ref<HomepageModule[]>([])
  const draftDynamicItems = ref<HomepageDynamicModule[]>([])
  const jsonErrors = ref<Record<string, string | null>>({})

  const { data, pending, error, refresh } = useAsyncData(
    'admin-homepage-modules',
    async () =>
      await requestFetch<HomepageModulesResponse>('/api/admin/homepage/modules', {
        credentials: 'include',
      }),
  )

  const { data: adminCategoriesData } = useAsyncData(
    'admin-homepage-categories-options',
    async () =>
      await requestFetch<{ items: Array<{ id: string; name: string }> }>('/api/admin/categories', {
        credentials: 'include',
        query: { page: 1, pageSize: 100 },
      }),
  )

  const { data: adminProductsData } = useAsyncData(
    'admin-homepage-products-options',
    async () =>
      await requestFetch<{
        items: Array<{
          id: string
          title: string
          slug: string
          basePrice: string
          originalPrice: string | null
          variantCount: number
          categoryIds?: string[]
          coverUrl?: string | null
        }>
      }>('/api/admin/products', {
        credentials: 'include',
        query: { page: 1, pageSize: 100 },
      }),
  )

  watch(
    () => data.value,
    (payload) => {
      const items = payload?.dynamicItems
      if (items?.length) {
        draftDynamicItems.value = normalizeDynamicHomepageModuleOrder(
          orderHomepageModulesBySortOrder(structuredClone(items)),
        )
      } else {
        draftItems.value = structuredClone(payload?.items ?? [])
        draftDynamicItems.value = toDynamicHomepageModules(draftItems.value)
      }
      jsonErrors.value = {}
    },
    { immediate: true },
  )

  const hasPublished = computed(() => data.value?.hasPublished ?? false)

  function moveItem(index: number, delta: number) {
    draftDynamicItems.value = moveDynamicHomepageModule(draftDynamicItems.value, index, delta)
  }

  function removeItem(index: number) {
    draftDynamicItems.value = removeDynamicHomepageModule(draftDynamicItems.value, index)
  }

  function updateJson(module: HomepageDynamicModule, value: string) {
    const errorMessage = updateDynamicModulePropsFromJson(module, value)
    jsonErrors.value[module.uid] = errorMessage
    saveError.value = errorMessage
  }

  function addCategory(
    module: HomepageDynamicModule<'category_grid1'> | HomepageDynamicModule<'product_slider1'>,
  ) {
    addCategoryToDynamicModule(module)
  }

  function removeCategory(
    module: HomepageDynamicModule<'category_grid1'> | HomepageDynamicModule<'product_slider1'>,
    index: number,
  ) {
    removeCategoryFromDynamicModule(module, index)
  }

  function addProduct(module: HomepageDynamicModule<'product_slider1'>) {
    addProductToDynamicModule(module)
  }

  function removeProduct(module: HomepageDynamicModule<'product_slider1'>, index: number) {
    removeProductFromDynamicModule(module, index)
  }

  function createModule(component: HomepageModuleComponentKey) {
    const uid = `mod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const module: HomepageDynamicModule = {
      uid,
      component,
      sortOrder: draftDynamicItems.value.length,
      isEnabled: true,
      props: {} as HomepageDynamicModule['props'],
    }

    if (component === 'nav1') {
      module.props = { show: true }
    } else if (component === 'hero3') {
      module.props = {
        hero: {
          badge: '多租戶線上商店',
          title: '',
          subtitle: '',
          primaryCta: { label: '', to: '/' },
          secondaryCta: { label: '', to: '/' },
        },
      }
    } else if (component === 'image_slider1') {
      module.props = {
        title: '',
        slides: [],
        ui: { autoplay: false, intervalMs: 4000, loop: true },
      }
    } else if (component === 'category_grid1') {
      module.props = {
        title: '',
        categories: [],
      }
    } else if (component === 'product_slider1') {
      module.props = {
        title: '',
        source: { type: 'manual', productIds: [], sort: 'manual' },
        ui: {
          perView: 16,
          autoplay: false,
          intervalMs: 4000,
          loop: false,
          displayMode: 'slider',
          gridColumns: 4,
        },
      }
    } else {
      module.props = { text: '' }
    }

    draftDynamicItems.value = normalizeDynamicHomepageModuleOrder([
      ...draftDynamicItems.value,
      module,
    ])
  }

  const availableCategories = computed(() => {
    const map = new Map<string, { id: string; label: string }>()

    for (const category of adminCategoriesData.value?.items ?? []) {
      if (!category?.id) continue
      map.set(category.id, { id: category.id, label: category.name || category.id })
    }

    for (const module of draftDynamicItems.value) {
      if (module.component !== 'category_grid1' && module.component !== 'product_slider1') continue
      const categories = (module.props as { categories?: Array<{ id: string; label: string }> }).categories
      if (!Array.isArray(categories)) continue
      for (const category of categories) {
        if (!category?.id) continue
        map.set(category.id, { id: category.id, label: category.label || category.id })
      }
    }

    return [...map.values()]
  })

  const availableProducts = computed<AdminProductOption[]>(() => {
    const map = new Map<string, AdminProductOption>()

    for (const product of adminProductsData.value?.items ?? []) {
      if (!product?.id) continue
      map.set(product.id, {
        id: product.id,
        name: product.title || product.id,
        slug: product.slug || '',
        priceLabel: `HK$${product.basePrice ?? '0'}`,
        displayPrice: product.basePrice ?? '0',
        originalPrice: product.originalPrice ?? null,
        hasVariants: (product.variantCount ?? 0) > 0,
        categoryIds: product.categoryIds ?? [],
        coverUrl: product.coverUrl ?? null,
      })
    }

    return [...map.values()]
  })

  const resolvedPreviewModules = computed(() =>
    resolveDynamicHomepageModules(draftDynamicItems.value, {
      categories: availableCategories.value.map((item) => ({ id: item.id, label: item.label })),
      products: toHomepagePreviewProducts(availableProducts.value),
    }),
  )

  async function saveDraft() {
    saveError.value = null
    saving.value = true

    try {
      await $fetch('/api/admin/homepage/modules', {
        method: 'PUT',
        credentials: 'include',
        body: { items: normalizeDynamicHomepageModuleOrder(draftDynamicItems.value) },
      })
      await refresh()
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      saveError.value = err?.data?.message || err?.message || '儲存草稿失敗'
    } finally {
      saving.value = false
    }
  }

  async function publishDraft() {
    saveError.value = null
    publishing.value = true

    try {
      await $fetch('/api/admin/homepage/modules/publish', {
        method: 'POST',
        credentials: 'include',
      })
      await refresh()
      // 發佈後清除店舖首頁 useAsyncData 快取，避免 SPA 導航仍顯示舊模組順序
      if (import.meta.client && tenantSlug.value) {
        await clearNuxtData(`tenant-homepage-modules-${tenantSlug.value}`)
        await clearNuxtData(`store-homepage-modules-nav-${tenantSlug.value}`)
      }
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      saveError.value = err?.data?.message || err?.message || '發佈失敗'
    } finally {
      publishing.value = false
    }
  }

  async function resetDraft() {
    saveError.value = null
    saving.value = true

    try {
      await $fetch('/api/admin/homepage/modules/reset-draft', {
        method: 'POST',
        credentials: 'include',
      })
      await refresh()
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      saveError.value = err?.data?.message || err?.message || '還原草稿失敗'
    } finally {
      saving.value = false
    }
  }

  return {
    draftItems,
    draftDynamicItems,
    availableCategories,
    availableProducts,
    resolvedPreviewModules,
    pending,
    error,
    hasPublished,
    saving,
    publishing,
    saveError,
    jsonErrors,
    moveItem,
    removeItem,
    updateJson,
    addCategory,
    removeCategory,
    addProduct,
    removeProduct,
    createModule,
    saveDraft,
    publishDraft,
    resetDraft,
  }
}
