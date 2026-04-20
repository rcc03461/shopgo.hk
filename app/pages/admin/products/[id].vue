<script setup lang="ts">
import type { ProductMediaItem } from '~/types/productMedia'

definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const id = computed(() => String(route.params.id))

type AttachmentDto = {
  id: string
  type: string
  mimetype: string
  filename: string
  extension: string
  size: number
  publicUrl: string | null
  storageKey: string | null
  createdAt: string
  updatedAt: string
}

type Detail = {
  product: {
    id: string
    slug: string
    title: string
    description: string | null
    basePrice: string
    originalPrice: string | null
    coverAttachmentId: string | null
    cover: AttachmentDto | null
    galleryAttachments: AttachmentDto[]
    categories: Array<{
      id: string
      name: string
      slug: string
      sortOrder: number
    }>
    updatedAt: string
  }
  options: Array<{
    id: string
    name: string
    sortOrder: number
    values: Array<{ id: string; value: string; sortOrder: number }>
  }>
  variants: Array<{
    id: string
    skuCode: string
    price: string
    stockQuantity: number
    imageUrl: string | null
    valueIndexes: number[]
  }>
}

/** SSR 時須沿用當前請求的 Cookie/Host，否則內部 /api/admin/* 會拿不到登入態或租戶 Host。 */
const requestFetch = useRequestFetch()

const { data, refresh, error } = await useAsyncData(
  () => `admin-product-detail-${id.value}`,
  async () => {
    return await requestFetch<Detail>(`/api/admin/products/${id.value}`, {
      credentials: 'include',
    })
  },
  { watch: [id] },
)

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

function toMediaItem(a: AttachmentDto): ProductMediaItem {
  return {
    id: a.id,
    publicUrl: a.publicUrl,
    filename: a.filename,
  }
}

watch(
  () => data.value,
  (v) => {
    if (!v?.product) return
    form.title = v.product.title
    form.slug = v.product.slug
    form.description = v.product.description ?? ''
    form.basePrice = v.product.basePrice
    form.originalPrice = v.product.originalPrice ?? ''
    coverAttachmentId.value = v.product.coverAttachmentId
    galleryItems.value = v.product.galleryAttachments.map(toMediaItem)
    categoryIds.value = (v.product.categories ?? []).map((c) => c.id)
  },
  { immediate: true },
)

const saving = ref(false)
const saveErr = ref<string | null>(null)

async function saveMain() {
  saving.value = true
  saveErr.value = null
  try {
    await $fetch(`/api/admin/products/${id.value}`, {
      method: 'PATCH',
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
    await refresh()
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    saveErr.value = x?.data?.message || x?.message || '儲存失敗'
  } finally {
    saving.value = false
  }
}

const drawerOpen = ref(false)

type CatalogDraft = {
  options: Array<{
    name: string
    sortOrder: number
    values: Array<{ value: string; sortOrder: number }>
  }>
  variants: Array<{
    skuCode: string
    price: string
    stockQuantity: number
    imageUrl: string
    valueIndexes: number[]
  }>
}

const catalogDraft = ref<CatalogDraft>({ options: [], variants: [] })

function cloneCatalogFromDetail(v: Detail): CatalogDraft {
  return {
    options: v.options.map((o) => ({
      name: o.name,
      sortOrder: o.sortOrder,
      values: o.values.map((x) => ({
        value: x.value,
        sortOrder: x.sortOrder,
      })),
    })),
    variants: v.variants.map((r) => ({
      skuCode: r.skuCode,
      price: r.price,
      stockQuantity: r.stockQuantity,
      imageUrl: r.imageUrl ?? '',
      valueIndexes: [...r.valueIndexes],
    })),
  }
}

function openCatalogDrawer() {
  if (!data.value) return
  catalogDraft.value = cloneCatalogFromDetail(data.value)
  drawerOpen.value = true
}

async function onCatalogSaved() {
  await refresh()
}

const coverPreview = computed<ProductMediaItem | null>(() => {
  const c = data.value?.product.cover
  if (!c) return null
  return toMediaItem(c)
})
</script>

<template>
  <div class="max-w-2xl">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-xl font-semibold tracking-tight">編輯商品</h1>
      <NuxtLink
        to="/admin/products"
        class="text-sm text-neutral-600 underline-offset-2 hover:underline"
      >
        返回列表
      </NuxtLink>
    </div>
    <p class="mt-1 font-mono text-xs text-neutral-500">id：{{ id }}</p>

    <p v-if="error" class="mt-4 text-sm text-red-600">
      無法載入商品（可能不存在或無權限）。
    </p>

    <template v-else-if="data">
      <form class="mt-6 space-y-4" @submit.prevent="saveMain">
        <p
          v-if="saveErr"
          class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ saveErr }}
        </p>

        <AdminFormTextInput v-model="form.title" label="名稱" required />

        <AdminFormTextInput
          v-model="form.slug"
          label="網址代號（slug）"
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
          :cover-preview="coverPreview"
        />

        <div class="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            :disabled="saving"
          >
            {{ saving ? '儲存中…' : '儲存主檔' }}
          </button>
          <button
            type="button"
            class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 hover:bg-neutral-50"
            @click="openCatalogDrawer"
          >
            規格與 SKU
          </button>
        </div>
      </form>

      <AdminProductCatalogDrawer
        v-model:open="drawerOpen"
        v-model:catalog="catalogDraft"
        :product-id="id"
        @saved="onCatalogSaved"
      />
    </template>
  </div>
</template>
