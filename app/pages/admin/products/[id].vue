<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const id = computed(() => String(route.params.id))

type Detail = {
  product: {
    id: string
    slug: string
    title: string
    description: string | null
    basePrice: string
    imageUrls: string[]
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

const { data, refresh, error } = await useAsyncData(
  () => `admin-product-detail-${id.value}`,
  async () => {
    return await $fetch<Detail>(`/api/admin/products/${id.value}`, {
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
  imageUrlsText: '',
})

watch(
  () => data.value,
  (v) => {
    if (!v?.product) return
    form.title = v.product.title
    form.slug = v.product.slug
    form.description = v.product.description ?? ''
    form.basePrice = v.product.basePrice
    form.imageUrlsText = (v.product.imageUrls ?? []).join('\n')
  },
  { immediate: true },
)

const saving = ref(false)
const saveErr = ref<string | null>(null)

async function saveMain() {
  saving.value = true
  saveErr.value = null
  const imageUrls = form.imageUrlsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  try {
    await $fetch(`/api/admin/products/${id.value}`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        title: form.title,
        slug: form.slug,
        description: form.description || null,
        basePrice: form.basePrice,
        imageUrls,
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

        <label class="block text-sm text-neutral-700">
          <span class="font-medium">名稱</span>
          <input
            v-model="form.title"
            required
            class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
          />
        </label>

        <label class="block text-sm text-neutral-700">
          <span class="font-medium">網址代號（slug）</span>
          <input
            v-model="form.slug"
            required
            class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm shadow-sm"
          />
        </label>

        <label class="block text-sm text-neutral-700">
          <span class="font-medium">描述</span>
          <textarea
            v-model="form.description"
            rows="4"
            class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
          />
        </label>

        <label class="block text-sm text-neutral-700">
          <span class="font-medium">基準價（NUMERIC 字串）</span>
          <input
            v-model="form.basePrice"
            required
            class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm shadow-sm"
          />
        </label>

        <label class="block text-sm text-neutral-700">
          <span class="font-medium">圖片 URL（每行一筆）</span>
          <textarea
            v-model="form.imageUrlsText"
            rows="3"
            class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs shadow-sm"
          />
        </label>

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
