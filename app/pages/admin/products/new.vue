<script setup lang="ts">
import type { ProductMediaItem } from '~/types/productMedia'

definePageMeta({
  layout: 'admin',
})

const form = reactive({
  title: '',
  slug: '',
  description: '',
  basePrice: '0',
  originalPrice: '',
})

const coverAttachmentId = ref<string | null>(null)
const galleryItems = ref<ProductMediaItem[]>([])
const categoryIds = ref<string[]>([])

const saving = ref(false)
const err = ref<string | null>(null)

async function submit() {
  saving.value = true
  err.value = null
  try {
    const res = await $fetch<{ product: { id: string } }>('/api/admin/products', {
      method: 'POST',
      credentials: 'include',
      body: {
        title: form.title,
        slug: form.slug,
        description: form.description || null,
        basePrice: form.basePrice,
        originalPrice: form.originalPrice || null,
        coverAttachmentId: coverAttachmentId.value,
        galleryAttachmentIds: galleryItems.value.map((g) => g.id),
        categoryIds: categoryIds.value,
      },
    })
    await navigateTo(`/admin/products/${res.product.id}`)
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || '建立失敗'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-xl">
    <h1 class="text-xl font-semibold tracking-tight">新增商品</h1>
    <p class="mt-1 text-sm text-neutral-600">
      建立後將導向以 id 編輯；前台仍使用 slug。
    </p>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <p v-if="err" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ err }}
      </p>

      <AdminFormTextInput v-model="form.title" label="名稱" required />

      <AdminFormTextInput
        v-model="form.slug"
        label="網址代號（slug）"
        hint="小寫英數與連字號"
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        title="小寫英數與連字號"
        required
        input-class="font-mono"
      />

      <AdminFormTextarea v-model="form.description" label="描述" :rows="4" />

      <AdminFormPriceInput
        v-model="form.basePrice"
        label="基準價（NUMERIC 字串）"
        required
      />

      <AdminFormPriceInput
        v-model="form.originalPrice"
        label="原價（僅展示，可留空）"
      />

      <AdminProductCategoryFields v-model="categoryIds" />

      <AdminProductMediaFields
        v-model:cover-attachment-id="coverAttachmentId"
        v-model:gallery-items="galleryItems"
      />

      <div class="flex gap-2 pt-2">
        <button
          type="submit"
          class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="saving"
        >
          {{ saving ? '建立中…' : '建立' }}
        </button>
        <NuxtLink
          to="/admin/products"
          class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
        >
          返回列表
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
