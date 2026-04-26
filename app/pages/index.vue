<script setup lang="ts">
import { landingHero, landingSlides } from '~/data/landing'
import type { LandingCategory, LandingProductCard } from '~/types/landing'
import type { HomepageDynamicModule, HomepageModule, HomepageProductSliderProps } from '../types/homepage'
import {
  collectHomepageProductCategoryIds,
  getHomepageProductCategoryPageSizes,
  resolveDynamicHomepageModules,
} from '~/utils/homepageModuleResolvers'
import { toDynamicHomepageModule } from '~/utils/homepageEditor'
import { formatHkd } from '~/utils/formatHkd'

definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const requestFetch = useRequestFetch()

const {
  data: tenantHomepageModulesData,
  pending: tenantHomepageModulesPending,
} = await useAsyncData(
  () => `tenant-homepage-modules-${tenantSlug.value ?? ''}`,
  async () => {
    if (!tenantSlug.value) {
      return {
        items: [] as HomepageModule[],
        dynamicItems: [] as HomepageDynamicModule[],
      }
    }
    const fetchApi = import.meta.server ? requestFetch : $fetch
    try {
      const res = await (fetchApi as any)('/api/store/homepage/modules')
      return {
        items: (res?.items ?? []) as HomepageModule[],
        dynamicItems: (res?.dynamicItems ?? []) as HomepageDynamicModule[],
      }
    } catch {
      // 尚未發佈首頁模組時，回退到既有首頁區塊，避免整頁錯誤。
      return {
        items: [] as HomepageModule[],
        dynamicItems: [] as HomepageDynamicModule[],
      }
    }
  },
  { watch: [tenantSlug] },
)

function getHomepageSourceModules(
  data: { items: HomepageModule[]; dynamicItems: HomepageDynamicModule[] } | null | undefined,
) {
  return data?.dynamicItems?.length
    ? data.dynamicItems
    : (data?.items ?? []).map((item) => toDynamicHomepageModule(item))
}

function hasManualProductSlider(modules: HomepageDynamicModule[]) {
  return modules.some((module) => {
    if (!module.isEnabled || module.component !== 'product_slider1') return false
    return (module.props as HomepageProductSliderProps).source?.type === 'manual'
  })
}

const {
  data: tenantLandingData,
  pending: tenantLandingPending,
  error: tenantLandingError,
  refresh: refreshTenantLanding,
} = await useAsyncData(
  () => `tenant-landing-categories-products-${tenantSlug.value ?? ''}`,
  async () => {
    if (!tenantSlug.value) {
      return {
        categories: [] as LandingCategory[],
        products: [] as LandingProductCard[],
      }
    }

    const fetchApi = import.meta.server ? requestFetch : $fetch

    const categoryRes = await (fetchApi as any)('/api/store/categories') as {
      categories: Array<{ id: string; name: string }>
    }

    const categories: LandingCategory[] = categoryRes.categories.map((category) => ({
      id: category.id,
      label: category.name,
    }))

    const sourceModules = getHomepageSourceModules(tenantHomepageModulesData.value)
    const shouldLoadAllCategoryProducts =
      sourceModules.length === 0 || hasManualProductSlider(sourceModules)
    const requestedCategoryIds = shouldLoadAllCategoryProducts
      ? categories.map((category) => category.id)
      : collectHomepageProductCategoryIds(sourceModules)
    const requestedCategoryIdSet = new Set(requestedCategoryIds)
    const requestedCategories = categories.filter((category) => requestedCategoryIdSet.has(category.id))
    const pageSizesByCategoryId = getHomepageProductCategoryPageSizes(sourceModules)

    const productResponses = await Promise.allSettled(
      requestedCategories.map(async (category) => {
        const pageSize = shouldLoadAllCategoryProducts
          ? 100
          : (pageSizesByCategoryId.get(category.id) ?? 16)
        const res = await (fetchApi as any)('/api/store/products', {
          query: {
            categoryId: category.id,
            page: 1,
            pageSize,
          },
        }) as {
          items: Array<{
            id: string
            slug: string
            title: string
            displayPrice: string
            originalPrice: string | null
            hasVariants: boolean
            coverUrl: string | null
          }>
        }

        return res.items.map(
          (item): LandingProductCard => ({
            id: item.id,
            categoryId: category.id,
            name: item.title,
            title: item.title,
            slug: item.slug,
            priceLabel: formatHkd(item.displayPrice),
            displayPrice: item.displayPrice,
            originalPrice: item.originalPrice,
            hasVariants: item.hasVariants,
            coverUrl: item.coverUrl,
            imageUrl:
              item.coverUrl ??
              'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
          }),
        )
      }),
    )

    return {
      categories,
      products: productResponses
        .filter(
          (
            result,
          ): result is PromiseFulfilledResult<LandingProductCard[]> =>
            result.status === 'fulfilled',
        )
        .flatMap((result) => result.value),
    }
  },
  { watch: [tenantSlug, tenantHomepageModulesData] },
)

const tenantLandingCategories = computed(
  () => tenantLandingData.value?.categories ?? [],
)

const tenantLandingProducts = computed(
  () => tenantLandingData.value?.products ?? [],
)

const enabledHomepageModules = computed(() =>
  resolveDynamicHomepageModules(
    getHomepageSourceModules(tenantHomepageModulesData.value),
    {
      categories: tenantLandingCategories.value,
      products: tenantLandingProducts.value,
    },
  )
    .filter((item) => item.isEnabled && item.component !== 'nav1')
    .sort((a, b) => a.sortOrder - b.sortOrder),
)
</script>

<template>
  <div v-if="tenantSlug" class="mx-auto max-w-5xl px-4 py-16 sm:px-6">
   
    <section
      v-if="tenantHomepageModulesPending"
      class="mt-16 animate-pulse rounded-xl border border-neutral-200 p-6"
      aria-label="首頁模組載入中"
    >
      <div class="h-4 w-32 rounded bg-neutral-200" />
      <div class="mt-4 flex flex-wrap gap-2">
        <div class="h-8 w-20 rounded-full bg-neutral-200" />
        <div class="h-8 w-24 rounded-full bg-neutral-200" />
        <div class="h-8 w-16 rounded-full bg-neutral-200" />
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <div
          v-for="n in 2"
          :key="`homepage-skeleton-${n}`"
          class="overflow-hidden rounded-xl border border-neutral-200"
        >
          <div class="h-40 bg-neutral-200" />
          <div class="space-y-2 px-4 py-4">
            <div class="h-4 w-4/5 rounded bg-neutral-200" />
            <div class="h-4 w-2/5 rounded bg-neutral-200" />
            <div class="h-4 w-1/3 rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </section>
    <template v-else-if="enabledHomepageModules.length">
      <HomepageModuleRenderer
        v-for="module in enabledHomepageModules"
        :key="module.uid"
        :module="module"
      />
    </template>
    <LandingCategoriesProductsSection
      v-else-if="!tenantLandingPending && !tenantLandingError"
      :categories="tenantLandingCategories"
      :products="tenantLandingProducts"
    />
    <section
      v-else
      class="mt-16 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      aria-live="polite"
    >
      <p>分類商品載入失敗，請稍後再試。</p>
      <button
        type="button"
        class="mt-3 inline-flex rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        @click="() => refreshTenantLanding()"
      >
        重新載入
      </button>
    </section>
  </div>

  <div v-else class="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
  
    <LandingHeroSection :hero="landingHero" />
    <LandingSliderSection :slides="landingSlides" />

  </div>
</template>
