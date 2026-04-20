<script setup lang="ts">
import { formatHkd } from '~/utils/formatHkd'

definePageMeta({
  layout: 'default',
})

type Category = { id: string; slug: string; name: string; sortOrder: number }

type ListItem = {
  id: string
  slug: string
  title: string
  basePrice: string
  originalPrice: string | null
  displayPrice: string
  hasVariants: boolean
  coverUrl: string | null
  updatedAt: string
}

function shouldShowOriginalPrice(originalPrice: string | null, displayPrice: string) {
  if (!originalPrice) return false
  return Number(originalPrice) > Number(displayPrice)
}

type ListResponse = {
  items: ListItem[]
  page: number
  pageSize: number
  total: number
}

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
/** SSR 內部 $fetch 需帶入原始 Host，否則店舖 API 無法解析子網域 */
const requestFetch = useRequestFetch()

const categoryId = computed(() => {
  const v = route.query.categoryId
  return typeof v === 'string' && v.length > 0 ? v : undefined
})

const qParam = computed(() => {
  const v = route.query.q
  return typeof v === 'string' ? v.trim() : ''
})

const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const { data: categoriesData, pending: catPending } = await useAsyncData(
  'store-categories',
  () =>
    tenantSlug.value
      ? requestFetch<{ categories: Category[] }>('/api/store/categories')
      : Promise.resolve({ categories: [] as Category[] }),
  { watch: [tenantSlug] },
)

const {
  data: listData,
  error: listError,
  pending: listPending,
} = await useAsyncData(
  'store-products-list',
  () => {
    if (!tenantSlug.value) {
      return Promise.resolve<ListResponse | null>(null)
    }
    return requestFetch<ListResponse>('/api/store/products', {
      query: {
        page: page.value,
        ...(categoryId.value ? { categoryId: categoryId.value } : {}),
        ...(qParam.value ? { q: qParam.value } : {}),
      },
    })
  },
  { watch: [() => route.fullPath, tenantSlug] },
)

const localQ = ref(qParam.value)

watch(
  () => qParam.value,
  (v) => {
    localQ.value = v
  },
)

function applySearch() {
  void navigateTo({
    path: '/products',
    query: {
      ...(categoryId.value ? { categoryId: categoryId.value } : {}),
      ...(localQ.value ? { q: localQ.value } : {}),
    },
  })
}

function setCategory(id: string | undefined) {
  void navigateTo({
    path: '/products',
    query: {
      ...(id ? { categoryId: id } : {}),
      ...(qParam.value ? { q: qParam.value } : {}),
    },
  })
}

const totalPages = computed(() => {
  const d = listData.value
  if (!d) return 1
  return Math.max(1, Math.ceil(d.total / d.pageSize))
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <div v-if="!tenantSlug" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
      <p class="font-medium">目前網址不是商店子網域</p>
      <p class="mt-2 text-amber-800/90">
        請改以 <span class="font-mono">你的商店.{{
          runtimeConfig.public.tenantRootDomain || 'oshop.com.hk'
        }}</span> 開啟本頁，例如瀏覽商品列表與篩選。
      </p>
    </div>

    <template v-else>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-neutral-500">
            商店 · <span class="font-mono">{{ tenantSlug }}</span>
          </p>
          <h1 class="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            全部商品
          </h1>
        </div>
        <NuxtLink
          to="/"
          class="text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          返回首頁
        </NuxtLink>
      </div>

      <div class="mt-10 flex flex-col gap-8 lg:flex-row">
        <!-- 左欄：分類篩選 -->
        <aside class="w-full shrink-0 lg:w-56">
          <div class="lg:sticky lg:top-6">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              分類
            </h2>
            <div v-if="catPending" class="mt-3 text-sm text-neutral-500">
              載入中…
            </div>
            <nav v-else class="mt-3 flex flex-col gap-1 border-l border-neutral-200 pl-3">
              <button
                type="button"
                class="text-left text-sm transition"
                :class="
                  !categoryId
                    ? 'font-semibold text-neutral-900'
                    : 'text-neutral-600 hover:text-neutral-900'
                "
                @click="setCategory(undefined)"
              >
                全部分類
              </button>
              <button
                v-for="c in categoriesData?.categories ?? []"
                :key="c.id"
                type="button"
                class="text-left text-sm transition"
                :class="
                  categoryId === c.id
                    ? 'font-semibold text-neutral-900'
                    : 'text-neutral-600 hover:text-neutral-900'
                "
                @click="setCategory(c.id)"
              >
                {{ c.name }}
              </button>
            </nav>
          </div>
        </aside>

        <!-- 右欄：搜尋 + 列表 -->
        <div class="min-w-0 flex-1">
          <form class="flex flex-col gap-2 sm:flex-row sm:items-center" @submit.prevent="applySearch">
            <input
              v-model="localQ"
              type="search"
              placeholder="搜尋商品名稱或網址代稱…"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-900/10 focus:border-neutral-900 focus:ring-2"
            >
            <button
              type="submit"
              class="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              搜尋
            </button>
          </form>

          <p v-if="listError" class="mt-6 text-sm text-red-600">
            無法載入商品：{{ listError.message }}
          </p>
          <p v-else-if="listPending" class="mt-10 text-sm text-neutral-500">
            載入商品中…
          </p>
          <template v-else-if="listData">
            <p class="mt-4 text-sm text-neutral-600">
              共 {{ listData.total }} 件
              <span v-if="qParam" class="text-neutral-500">（關鍵字：{{ qParam }}）</span>
            </p>

            <ul
              v-if="listData.items.length > 0"
              class="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
            >
              <li v-for="item in listData.items" :key="item.id">
                <NuxtLink
                  :to="`/products/${item.slug}`"
                  class="group flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:border-neutral-300 hover:shadow"
                >
                  <div class="aspect-[4/3] bg-neutral-100">
                    <img
                      v-if="item.coverUrl"
                      :src="item.coverUrl"
                      :alt="item.title"
                      class="h-full w-full object-cover transition group-hover:opacity-95"
                    >
                    <div
                      v-else
                      class="flex h-full w-full items-center justify-center text-xs text-neutral-400"
                    >
                      無封面
                    </div>
                  </div>
                  <div class="flex flex-1 flex-col gap-1 p-4">
                    <h3 class="text-sm font-semibold text-neutral-900 group-hover:underline">
                      {{ item.title }}
                    </h3>
                    <p class="font-mono text-xs text-neutral-500">
                      /{{ item.slug }}
                    </p>
                    <p class="mt-auto pt-2 text-sm font-medium text-neutral-900">
                      {{ formatHkd(item.displayPrice) }}
                      <span v-if="item.hasVariants" class="text-xs font-normal text-neutral-500">起</span>
                    </p>
                    <p
                      v-if="shouldShowOriginalPrice(item.originalPrice, item.displayPrice)"
                      class="text-xs text-neutral-400 line-through"
                    >
                      {{ formatHkd(item.originalPrice!) }}
                    </p>
                  </div>
                </NuxtLink>
              </li>
            </ul>
            <p v-else class="mt-10 text-sm text-neutral-600">
              沒有符合條件的商品。
            </p>

            <nav
              v-if="listData.items.length > 0 && totalPages > 1"
              class="mt-10 flex items-center justify-center gap-2 text-sm"
            >
              <NuxtLink
                v-if="page > 1"
                class="rounded-md border border-neutral-300 px-3 py-1.5 font-medium hover:bg-neutral-50"
                :to="{ path: '/products', query: { ...route.query, page: page - 1 } }"
              >
                上一頁
              </NuxtLink>
              <span class="text-neutral-500">
                第 {{ page }} / {{ totalPages }} 頁
              </span>
              <NuxtLink
                v-if="page < totalPages"
                class="rounded-md border border-neutral-300 px-3 py-1.5 font-medium hover:bg-neutral-50"
                :to="{ path: '/products', query: { ...route.query, page: page + 1 } }"
              >
                下一頁
              </NuxtLink>
            </nav>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
