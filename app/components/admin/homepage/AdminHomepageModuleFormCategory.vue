<script setup lang="ts">
import type { HomepageCategoryModuleConfig } from '../../../types/homepage'

const props = defineProps<{
  config: HomepageCategoryModuleConfig
  availableCategories?: Array<{ id: string; label: string }>
}>()

const categorySearch = ref('')
const selectedCategoryIds = computed(() => new Set((props.config.categories ?? []).map((item) => item.id)))
const availableCategoryOptions = computed(() => props.availableCategories ?? [])

const filteredCategoryOptions = computed(() => {
  const keyword = categorySearch.value.trim().toLowerCase()
  if (!keyword) return availableCategoryOptions.value
  return availableCategoryOptions.value.filter((category) => {
    const haystack = `${category.label} ${category.id}`.toLowerCase()
    return haystack.includes(keyword)
  })
})

function syncCategories(nextIds: string[]) {
  const map = new Map(availableCategoryOptions.value.map((item) => [item.id, item]))
  props.config.categories = nextIds.map((id) => {
    const option = map.get(id)
    return { id, label: option?.label ?? id }
  })
}

function toggleCategory(id: string) {
  const ids = new Set(selectedCategoryIds.value)
  if (ids.has(id)) ids.delete(id)
  else ids.add(id)
  syncCategories([...ids])
}

function selectAllCategories() {
  syncCategories(availableCategoryOptions.value.map((item) => item.id))
}

function clearCategories() {
  syncCategories([])
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
    <div class="rounded-md border border-neutral-200 p-3">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-xs font-medium text-neutral-500">
          分類列表（已選 {{ config.categories.length }}）
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
            @click="selectAllCategories"
          >
            全選
          </button>
          <button
            type="button"
            class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
            @click="clearCategories"
          >
            清空
          </button>
        </div>
      </div>
      <label class="mb-2 block text-xs text-neutral-600">
        搜尋分類（名稱 / ID）
        <input
          v-model.trim="categorySearch"
          type="text"
          class="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
          placeholder="例如：new-arrivals / 家居生活"
        >
      </label>
      <div class="max-h-48 space-y-1 overflow-auto rounded border border-neutral-200 bg-white p-2">
        <label
          v-for="category in filteredCategoryOptions"
          :key="`pick-category-${category.id}`"
          class="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-neutral-50"
        >
          <span class="min-w-0 truncate text-xs text-neutral-700">
            {{ category.label }} ({{ category.id }})
          </span>
          <input
            type="checkbox"
            :checked="selectedCategoryIds.has(category.id)"
            class="h-4 w-4 rounded border-neutral-300"
            @change="toggleCategory(category.id)"
          >
        </label>
        <p v-if="!availableCategoryOptions.length" class="text-xs text-neutral-500">
          /admin/categories 暫無分類資料。
        </p>
        <p v-else-if="!filteredCategoryOptions.length" class="text-xs text-neutral-500">
          沒有符合搜尋條件的分類。
        </p>
      </div>
    </div>
  </div>
</template>
