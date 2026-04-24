<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type AttachmentRow = {
  id: string
  type: string
  mimetype: string
  filename: string
  extension: string
  size: number
  publicUrl: string | null
  createdAt: string
  updatedAt: string
}

type AttachmentListResponse = {
  items: AttachmentRow[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

const PAGE_SIZE = 24

const items = ref<AttachmentRow[]>([])
const page = ref(1)
const total = ref(0)
const hasMore = ref(true)
const pending = ref(false)
const err = ref<string | null>(null)

const requestFetch = useRequestFetch()
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-HK')
  } catch {
    return iso
  }
}

async function loadPage(targetPage: number) {
  if (pending.value) return
  if (!hasMore.value && targetPage > 1) return
  pending.value = true
  err.value = null
  try {
    const res = await requestFetch<AttachmentListResponse>('/api/admin/attachments', {
      credentials: 'include',
      query: { page: targetPage, pageSize: PAGE_SIZE },
    })
    if (targetPage === 1) {
      items.value = res.items
    } else {
      items.value.push(...res.items)
    }
    page.value = res.page
    total.value = res.total
    hasMore.value = res.hasMore
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || '載入媒體資源失敗'
  } finally {
    pending.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || pending.value) return
  await loadPage(page.value + 1)
}

onMounted(async () => {
  await loadPage(1)
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return
      void loadMore()
    },
    { root: null, rootMargin: '240px 0px', threshold: 0 },
  )
  if (sentinelRef.value) observer.observe(sentinelRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">Media Assets</h1>
        <p class="mt-1 text-sm text-neutral-600">
          顯示此租戶所有上傳檔案，向下捲動自動載入更多。
        </p>
      </div>
      <p class="text-xs text-neutral-500">共 {{ total }} 個檔案</p>
    </div>

    <p v-if="err" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ err }}
    </p>

    <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <article
        v-for="item in items"
        :key="item.id"
        class="overflow-hidden rounded-lg border border-neutral-200 bg-white"
      >
        <a
          v-if="item.publicUrl"
          :href="item.publicUrl"
          target="_blank"
          rel="noreferrer"
          class="block aspect-square bg-neutral-100"
        >
          <img
            :src="item.publicUrl"
            :alt="item.filename"
            loading="lazy"
            class="h-full w-full object-cover"
          />
        </a>
        <div v-else class="flex aspect-square items-center justify-center bg-neutral-100 text-xs text-neutral-500">
          無預覽
        </div>
        <div class="space-y-1 px-3 py-2">
          <p class="truncate text-xs font-medium text-neutral-900" :title="item.filename">
            {{ item.filename }}
          </p>
          <p class="text-xs text-neutral-500">
            {{ item.extension.toUpperCase() }} · {{ formatBytes(item.size) }}
          </p>
          <p class="text-[11px] text-neutral-400">
            {{ formatTime(item.createdAt) }}
          </p>
        </div>
      </article>
    </div>

    <p
      v-if="pending"
      class="mt-4 text-center text-sm text-neutral-500"
    >
      載入中…
    </p>
    <p
      v-else-if="!items.length"
      class="mt-6 text-center text-sm text-neutral-500"
    >
      尚未上傳任何檔案
    </p>
    <p
      v-else-if="!hasMore"
      class="mt-6 text-center text-xs text-neutral-400"
    >
      已載入全部檔案
    </p>

    <div ref="sentinelRef" class="h-8 w-full" aria-hidden="true" />
  </div>
</template>
