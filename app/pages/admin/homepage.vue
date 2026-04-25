<script setup lang="ts">
import type { HomepageModuleComponentKey } from '../../types/homepage'

definePageMeta({
  layout: 'admin',
})

const {
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
  updateJson,
  addCategory,
  removeCategory,
  addProduct,
  removeProduct,
  createModule,
  saveDraft,
  publishDraft,
  resetDraft,
} = await useHomepageEditor()

const newModuleComponent = ref<HomepageModuleComponentKey>('image_slider1')
const moduleOptions: Array<{ value: HomepageModuleComponentKey; label: string }> = [
  { value: 'image_slider1', label: '圖片輪播 image_slider1' },
  { value: 'hero3', label: '主視覺 hero3' },
  { value: 'category_grid1', label: '分類格 category_grid1' },
  { value: 'product_slider1', label: '商品輪播 product_slider1' },
  { value: 'footer1', label: '頁尾 footer1' },
]
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">首頁模組</h1>
      <p class="mt-1 text-sm text-neutral-600">
        編輯草稿後按「發佈」才會套用到店舖首頁。可調整模組順序、啟用狀態與設定內容。
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        :disabled="saving || publishing || pending"
        @click="saveDraft"
      >
        儲存草稿
      </button>
      <button
        type="button"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        :disabled="saving || publishing || pending"
        @click="publishDraft"
      >
        發佈
      </button>
      <button
        type="button"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        :disabled="saving || publishing || pending"
        @click="resetDraft"
      >
        放棄草稿改動
      </button>
      <label class="ml-2 text-sm text-neutral-700">
        <span class="mr-2 text-xs text-neutral-500">新增模組</span>
        <select
          v-model="newModuleComponent"
          class="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm text-neutral-700"
          :disabled="saving || publishing || pending"
        >
          <option v-for="option in moduleOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <button
        type="button"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        :disabled="saving || publishing || pending"
        @click="createModule(newModuleComponent)"
      >
        + 新增
      </button>
      <span class="ml-auto text-xs text-neutral-500">
        已發佈版本：{{ hasPublished ? '有' : '尚未建立' }}
      </span>
    </div>

    <p v-if="saveError" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ saveError }}</p>
    <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">讀取首頁模組失敗，請重整再試。</p>

    <div class="grid gap-4 xl:grid-cols-2">
      <div class="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
        <p v-if="pending" class="px-2 py-4 text-sm text-neutral-500">載入中…</p>
        <div v-else class="space-y-3">
          <AdminHomepageModuleCard
            v-for="(module, index) in draftDynamicItems"
            :key="module.uid"
            :module="module"
            :disabled="saving || publishing || pending"
            :json-error="jsonErrors[module.uid]"
            :available-categories="availableCategories"
            :available-products="availableProducts"
            @move="(delta) => moveItem(index, delta)"
            @update-json="(value) => updateJson(module, value)"
            @add-category="addCategory"
            @remove-category="removeCategory"
            @add-product="addProduct"
            @remove-product="removeProduct"
          />
        </div>
      </div>
      <AdminHomepagePreview :modules="resolvedPreviewModules" />
    </div>
  </div>
</template>
