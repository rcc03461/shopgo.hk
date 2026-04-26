<script setup lang="ts">
import type { HomepageProductSliderProps, HomepageProductsModuleConfig } from '../../../types/homepage'

const props = defineProps<{
  config: HomepageProductsModuleConfig | HomepageProductSliderProps
  availableCategories?: Array<{ id: string; label: string }>
  availableProducts?: Array<{
    id: string
    name: string
    slug: string
    priceLabel: string
    categoryIds: string[]
    coverUrl: string | null
  }>
}>()

const emit = defineEmits<{
  addCategory: []
  removeCategory: [index: number]
  addProduct: []
  removeProduct: [index: number]
}>()

const categories = computed(() => props.config.categories ?? [])
const productSearch = ref('')
const categoryOptions = computed(() => {
  const map = new Map<string, { id: string; label: string }>()
  for (const category of props.availableCategories ?? []) {
    if (!category?.id) continue
    map.set(category.id, { id: category.id, label: category.label || category.id })
  }
  for (const category of categories.value) {
    if (!category?.id) continue
    if (!map.has(category.id)) {
      map.set(category.id, { id: category.id, label: category.label || category.id })
    }
  }
  return [...map.values()]
})

const productOptions = computed(() => {
  const map = new Map<string, {
    id: string
    name: string
    slug: string
    priceLabel: string
    categoryIds: string[]
    coverUrl: string | null
  }>()
  for (const product of props.availableProducts ?? []) {
    if (!product?.id) continue
    map.set(product.id, product)
  }
  return [...map.values()]
})

const filteredProductOptions = computed(() => {
  const keyword = productSearch.value.trim().toLowerCase()
  if (!keyword) return productOptions.value
  return productOptions.value.filter((product) => {
    const haystack = `${product.name} ${product.id} ${product.slug}`.toLowerCase()
    return haystack.includes(keyword)
  })
})

function isSelectedProduct(productId: string) {
  if (props.config.source?.type !== 'manual') return false
  return props.config.source.productIds.includes(productId)
}

function toggleSelectedProduct(productId: string) {
  if (props.config.source?.type !== 'manual') return
  const ids = props.config.source.productIds
  const exists = ids.includes(productId)
  props.config.source.productIds = exists ? ids.filter((id) => id !== productId) : [...ids, productId]
}

function selectAllProducts() {
  if (props.config.source?.type !== 'manual') return
  props.config.source.productIds = productOptions.value.map((item) => item.id)
}

function clearSelectedProducts() {
  if (props.config.source?.type !== 'manual') return
  props.config.source.productIds = []
}
</script>

<template>
  <div class="space-y-3">
    <label class="text-sm text-neutral-700">
      <span class="mb-1 block text-xs text-neutral-500">區塊標題</span>
      <input
        v-model="config.title"
        type="text"
        class="w-full rounded-md border border-neutral-300 px-3 py-2"
      >
    </label>

    <div class="grid gap-2 rounded-md border border-neutral-200 p-3 md:grid-cols-2">
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">資料來源</span>
        <select
          v-model="config.source!.type"
          class="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
          <option value="manual">手動商品清單</option>
          <option value="category">分類自動帶入</option>
        </select>
      </label>
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">展示模式</span>
        <select
          v-model="config.ui!.displayMode"
          class="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
          <option value="slider">Slider 輪播</option>
          <option value="grid">Grid 排版</option>
        </select>
      </label>
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">Slider 每頁顯示</span>
        <input
          v-model.number="config.ui!.perView"
          type="number"
          min="1"
          max="24"
          class="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
      </label>
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">Grid 每列顯示</span>
        <input
          v-model.number="config.ui!.gridColumns"
          type="number"
          min="1"
          max="6"
          class="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
      </label>
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">自動播放</span>
        <input v-model="config.ui!.autoplay" type="checkbox" class="h-4 w-4 rounded border-neutral-300">
      </label>
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">輪播間隔 (ms)</span>
        <input
          v-model.number="config.ui!.intervalMs"
          type="number"
          min="1000"
          step="500"
          class="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
      </label>
    </div>

    <div class="rounded-md border border-neutral-200 p-3">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-xs font-medium text-neutral-500">分類列表</p>
        <button
          type="button"
          class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          @click="emit('addCategory')"
        >
          新增分類
        </button>
      </div>
      <div class="space-y-2">
        <div
          v-for="(category, cIdx) in categories"
          :key="`prd-cat-${category.id}-${cIdx}`"
          class="grid gap-2 md:grid-cols-[1fr_2fr_auto]"
        >
          <input
            v-model="category.id"
            type="text"
            class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="category id"
          >
          <input
            v-model="category.label"
            type="text"
            class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="分類名稱"
          >
          <button
            type="button"
            class="rounded border border-red-200 px-2 py-1.5 text-xs text-red-700 hover:bg-red-50"
            @click="emit('removeCategory', cIdx)"
          >
            刪除
          </button>
        </div>
      </div>
    </div>

    <div v-if="config.source?.type === 'category'" class="grid gap-2 rounded-md border border-neutral-200 p-3 md:grid-cols-2">
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">分類</span>
        <select
          v-model="config.source.categoryId"
          class="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
          <option value="">請選擇分類</option>
          <option v-for="category in categoryOptions" :key="category.id" :value="category.id">
            {{ category.label }} ({{ category.id }})
          </option>
        </select>
      </label>
      <label class="text-sm text-neutral-700">
        <span class="mb-1 block text-xs text-neutral-500">取商品數量</span>
        <input
          v-model.number="config.source.limit"
          type="number"
          min="1"
          max="100"
          class="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
      </label>
      <label class="text-sm text-neutral-700 md:col-span-2">
        <span class="mb-1 block text-xs text-neutral-500">排序</span>
        <select
          v-model="config.source.sort"
          class="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
          <option value="newest">最新優先</option>
          <option value="price_asc">價格低到高</option>
          <option value="price_desc">價格高到低</option>
        </select>
      </label>
    </div>

    <div v-else class="rounded-md border border-neutral-200 p-3">
      <div class="mb-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-xs font-medium text-neutral-600">
            已選商品：{{ config.source?.type === 'manual' ? config.source.productIds.length : 0 }}
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-white"
              @click="selectAllProducts"
            >
              全選
            </button>
            <button
              type="button"
              class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-white"
              @click="clearSelectedProducts"
            >
              清空
            </button>
          </div>
        </div>
        <label class="mb-2 block text-xs text-neutral-600">
          搜尋商品（名稱 / ID / slug）
          <input
            v-model.trim="productSearch"
            type="text"
            class="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="例如：new-arrivals / p-001 / candle"
          >
        </label>
        <div class="max-h-40 space-y-1 overflow-auto rounded border border-neutral-200 bg-white p-2">
          <label
            v-for="product in filteredProductOptions"
            :key="`pick-${product.id}`"
            class="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-neutral-50"
          >
            <span class="min-w-0 truncate text-xs text-neutral-700">
              {{ product.name }} ({{ product.id }})
            </span>
            <input
              type="checkbox"
              :checked="isSelectedProduct(product.id)"
              class="h-4 w-4 rounded border-neutral-300"
              @change="toggleSelectedProduct(product.id)"
            >
          </label>
          <p v-if="!productOptions.length" class="text-xs text-neutral-500">暫無可選商品。</p>
          <p v-else-if="!filteredProductOptions.length" class="text-xs text-neutral-500">
            沒有符合搜尋條件的商品。
          </p>
        </div>
      </div>

      <p class="text-xs text-neutral-500">
        商品內容由後台商品資料即時查詢，不再寫入本模組 JSON。
      </p>
    </div>
  </div>
</template>
