<script setup lang="ts">
import type {
  HomepageBannerModuleConfig,
  HomepageCategoryModuleConfig,
  HomepageDynamicModule,
  HomepageFooterModuleConfig,
  HomepageNavModuleConfig,
  HomepageProductSliderProps,
  HomepageProductsModuleConfig,
} from '../../../types/homepage'

const props = defineProps<{
  module: HomepageDynamicModule
  availableCategories?: Array<{ id: string; label: string }>
  availableProducts?: Array<{
    id: string
    name: string
    slug: string
    priceLabel: string
    categoryIds: string[]
    coverUrl: string | null
  }>
  disabled?: boolean
  jsonError?: string | null
}>()

const emit = defineEmits<{
  move: [delta: number]
  updateJson: [value: string]
  addCategory: [module: HomepageDynamicModule<'category_grid1'> | HomepageDynamicModule<'product_slider1'>]
  removeCategory: [module: HomepageDynamicModule<'category_grid1'> | HomepageDynamicModule<'product_slider1'>, index: number]
  addProduct: [module: HomepageDynamicModule<'product_slider1'>]
  removeProduct: [module: HomepageDynamicModule<'product_slider1'>, index: number]
}>()

const navConfig = computed<HomepageNavModuleConfig | null>(() =>
  props.module.component === 'nav1' ? (props.module.props as HomepageNavModuleConfig) : null,
)

const bannerConfig = computed<HomepageBannerModuleConfig | null>(() =>
  props.module.component === 'hero3'
    ? (props.module.props as HomepageBannerModuleConfig)
    : null,
)

const categoryConfig = computed<HomepageCategoryModuleConfig | null>(() =>
  props.module.component === 'category_grid1'
    ? (props.module.props as HomepageCategoryModuleConfig)
    : null,
)

const productsConfig = computed<(HomepageProductsModuleConfig | HomepageProductSliderProps) | null>(() =>
  props.module.component === 'product_slider1'
    ? (props.module.props as HomepageProductSliderProps)
    : null,
)

const footerConfig = computed<HomepageFooterModuleConfig | null>(() =>
  props.module.component === 'footer1'
    ? (props.module.props as HomepageFooterModuleConfig)
    : null,
)
</script>

<template>
  <article class="rounded-lg border border-neutral-200 p-4">
    <div class="flex items-center gap-3">
      <div>
        <p class="text-sm font-semibold text-neutral-900">{{ module.component }}</p>
        <p class="text-xs text-neutral-500">{{ module.uid }}</p>
      </div>
      <label class="ml-auto flex items-center gap-2 text-sm text-neutral-700">
        <input v-model="module.isEnabled" type="checkbox" class="h-4 w-4 rounded border-neutral-300">
        啟用
      </label>
      <button
        type="button"
        class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        :disabled="disabled"
        @click="emit('move', -1)"
      >
        上移
      </button>
      <button
        type="button"
        class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        :disabled="disabled"
        @click="emit('move', 1)"
      >
        下移
      </button>
    </div>

    <div class="mt-3">
      <AdminHomepageModuleFormNav
        v-if="module.component === 'nav1' && navConfig"
        :config="navConfig"
      />

      <AdminHomepageModuleFormBanner
        v-else-if="module.component === 'hero3' && bannerConfig"
        :config="bannerConfig"
      />

      <AdminHomepageModuleFormCategory
        v-else-if="module.component === 'category_grid1' && categoryConfig"
        :config="categoryConfig"
        :available-categories="availableCategories ?? []"
      />

      <AdminHomepageModuleFormProducts
        v-else-if="module.component === 'product_slider1' && productsConfig"
        :config="productsConfig"
        :available-categories="availableCategories ?? []"
        :available-products="availableProducts ?? []"
        @add-category="emit('addCategory', module as HomepageDynamicModule<'product_slider1'>)"
        @remove-category="(index) => emit('removeCategory', module as HomepageDynamicModule<'product_slider1'>, index)"
        @add-product="emit('addProduct', module as HomepageDynamicModule<'product_slider1'>)"
        @remove-product="(index) => emit('removeProduct', module as HomepageDynamicModule<'product_slider1'>, index)"
      />

      <AdminHomepageModuleFormFooter
        v-else-if="module.component === 'footer1' && footerConfig"
        :config="footerConfig"
      />

      <AdminHomepageModuleJsonEditor
        :value="JSON.stringify(module.props, null, 2)"
        :error="jsonError"
        @update="emit('updateJson', $event)"
      />
    </div>
  </article>
</template>
