<script setup lang="ts">
import { formatHkd } from '~/utils/formatHkd'

definePageMeta({
  layout: 'default',
})

type Attachment = {
  id: string
  type: string
  mimetype: string
  filename: string
  extension: string
  publicUrl: string | null
  createdAt: string
  updatedAt: string
}

type Product = {
  id: string
  slug: string
  title: string
  description: string | null
  basePrice: string
  originalPrice: string | null
  coverAttachmentId: string | null
  cover: Attachment | null
  galleryAttachments: Attachment[]
  categories: { id: string; name: string; slug: string; sortOrder: number }[]
  createdAt: string
  updatedAt: string
}

type OptionRow = {
  id: string
  name: string
  sortOrder: number
  values: { id: string; value: string; sortOrder: number }[]
}

type VariantRow = {
  id: string
  skuCode: string
  price: string
  stockQuantity: number
  imageUrl: string | null
  valueIndexes: number[]
}

type DetailResponse = {
  product: Product
  options: OptionRow[]
  variants: VariantRow[]
}

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const route = useRoute()
const slug = computed(() => String(route.params.product_slug ?? ''))
const requestFetch = useRequestFetch()

const { data, error, pending } = await useAsyncData(
  'store-product-detail',
  () => {
    if (!tenantSlug.value || !slug.value) {
      return Promise.resolve<DetailResponse | null>(null)
    }
    return requestFetch<DetailResponse>(
      `/api/store/products/${encodeURIComponent(slug.value)}`,
    )
  },
  { watch: [() => route.params.product_slug, tenantSlug] },
)

/** 每個規格類型目前選中的「值索引」（對應 options[i].values 的下標） */
const selectedValueIndexes = ref<number[]>([])

watch(
  () => data.value,
  (d) => {
    if (!d) {
      selectedValueIndexes.value = []
      return
    }
    selectedValueIndexes.value = d.options.map(() => 0)
  },
  { immediate: true },
)

const manualHeroUrl = ref<string | null>(null)

const activeVariant = computed(() => {
  const d = data.value
  if (!d) return null
  if (d.options.length === 0) {
    return d.variants[0] ?? null
  }
  const chosen = selectedValueIndexes.value
  if (chosen.length !== d.options.length) return null
  return (
    d.variants.find((v) =>
      v.valueIndexes.every((idx, i) => idx === chosen[i]),
    ) ?? null
  )
})

watch(activeVariant, (v) => {
  if (v?.imageUrl) manualHeroUrl.value = null
})

watch(
  () => data.value?.product.id,
  () => {
    manualHeroUrl.value = null
  },
)

const heroImage = computed(() => {
  const d = data.value
  if (!d) return null
  if (activeVariant.value?.imageUrl) return activeVariant.value.imageUrl
  if (manualHeroUrl.value) return manualHeroUrl.value
  if (d.product.cover?.publicUrl) return d.product.cover.publicUrl
  const g = d.product.galleryAttachments.find((a) => a.publicUrl)
  return g?.publicUrl ?? null
})

function setOptionValue(optionIndex: number, valueIndex: number) {
  const next = [...selectedValueIndexes.value]
  next[optionIndex] = valueIndex
  selectedValueIndexes.value = next
}

function pickGallery(url: string) {
  manualHeroUrl.value = url
}

const displayPrice = computed(() => {
  const d = data.value
  if (!d) return null
  if (activeVariant.value) return activeVariant.value.price
  return d.product.basePrice
})

const showOriginalPrice = computed(() => {
  const d = data.value
  const p = displayPrice.value
  if (!d || !p || !d.product.originalPrice) return false
  return Number(d.product.originalPrice) > Number(p)
})

const { addLine } = useStoreCart()
const cartHint = ref('')

function optionSummaryText() {
  const d = data.value
  if (!d || d.options.length === 0) return undefined
  return d.options
    .map((opt, i) => {
      const vi = selectedValueIndexes.value[i] ?? 0
      const val = opt.values[vi]
      return val?.value ? `${opt.name}: ${val.value}` : ''
    })
    .filter(Boolean)
    .join('、')
}

async function handleAddToCart() {
  cartHint.value = ''
  const d = data.value
  if (!d) return
  if (d.options.length > 0 && !activeVariant.value) {
    cartHint.value = '請先選擇完整規格'
    return
  }
  if (activeVariant.value && activeVariant.value.stockQuantity < 1) {
    cartHint.value = '此規格目前無庫存'
    return
  }
  const price = displayPrice.value ?? d.product.basePrice
  await addLine({
    productId: d.product.id,
    productSlug: d.product.slug,
    variantId: activeVariant.value?.id ?? null,
    title: d.product.title,
    unitPrice: price,
    optionSummary: optionSummaryText(),
  })
  cartHint.value = '已加入購物車'
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <div v-if="!tenantSlug" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
      <p class="font-medium">目前網址不是商店子網域</p>
      <p class="mt-2 text-amber-800/90">
        請改以商店子網域開啟商品頁。
      </p>
    </div>

    <template v-else>
      <NuxtLink
        to="/products"
        class="text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
      >
        ← 返回商品列表
      </NuxtLink>

      <p v-if="error" class="mt-8 text-sm text-red-600">
        {{ error.message }}
      </p>
      <p v-else-if="pending" class="mt-8 text-sm text-neutral-500">
        載入商品中…
      </p>
      <article v-else-if="data" class="mt-8 grid gap-10 lg:grid-cols-2">
        <div class="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
          <div class="aspect-square">
            <img
              v-if="heroImage"
              :src="heroImage"
              :alt="data.product.title"
              class="h-full w-full object-contain"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-sm text-neutral-400"
            >
              無圖片
            </div>
          </div>
          <ul
            v-if="data.product.galleryAttachments.filter((a) => a.publicUrl).length > 0"
            class="flex gap-2 overflow-x-auto border-t border-neutral-200 bg-white p-2"
          >
            <li
              v-for="a in data.product.galleryAttachments.filter((x) => x.publicUrl)"
              :key="a.id"
            >
              <button
                type="button"
                class="h-14 w-14 overflow-hidden rounded border border-neutral-200 ring-offset-2 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                @click="pickGallery(a.publicUrl!)"
              >
                <img :src="a.publicUrl!" :alt="a.filename" class="h-full w-full object-cover">
              </button>
            </li>
          </ul>
        </div>

        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-neutral-500">
            <span class="font-mono">{{ tenantSlug }}</span>
          </p>
          <h1 class="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
            {{ data.product.title }}
          </h1>
          <p class="mt-1 font-mono text-xs text-neutral-500">
            {{ data.product.slug }}
          </p>

          <p v-if="displayPrice" class="mt-6 text-2xl font-semibold text-neutral-900">
            {{ formatHkd(displayPrice) }}
            <span
              v-if="data.options.length > 0 && !activeVariant"
              class="text-sm font-normal text-neutral-500"
            >
              （請選擇規格）
            </span>
          </p>
          <p
            v-if="showOriginalPrice"
            class="mt-1 text-sm text-neutral-400 line-through"
          >
            {{ formatHkd(data.product.originalPrice!) }}
          </p>
          <p
            v-if="activeVariant"
            class="mt-1 text-xs text-neutral-500"
          >
            SKU：{{ activeVariant.skuCode }} · 庫存 {{ activeVariant.stockQuantity }}
          </p>

          <div class="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="data.options.length > 0 && !activeVariant"
              @click="handleAddToCart"
            >
              加入購物車
            </button>
            <NuxtLink
              to="/cart"
              class="inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              查看購物車
            </NuxtLink>
          </div>
          <p v-if="cartHint" class="mt-2 text-xs text-amber-800">
            {{ cartHint }}
          </p>

          <div v-if="data.product.categories.length > 0" class="mt-6 flex flex-wrap gap-2">
            <span
              v-for="c in data.product.categories"
              :key="c.id"
              class="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700"
            >
              {{ c.name }}
            </span>
          </div>

          <div v-if="data.options.length > 0" class="mt-8 space-y-6">
            <div v-for="(opt, oi) in data.options" :key="opt.id">
              <h2 class="text-sm font-semibold text-neutral-900">
                {{ opt.name }}
              </h2>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="(val, vi) in opt.values"
                  :key="val.id"
                  type="button"
                  class="rounded-md border px-3 py-1.5 text-sm transition"
                  :class="
                    selectedValueIndexes[oi] === vi
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-300 text-neutral-800 hover:border-neutral-400'
                  "
                  @click="setOptionValue(oi, vi)"
                >
                  {{ val.value }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="data.product.description" class="mt-10 text-neutral-700">
            <h2 class="text-sm font-semibold text-neutral-900">
              商品說明
            </h2>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {{ data.product.description }}
            </p>
          </div>
        </div>
      </article>
    </template>
  </div>
</template>
