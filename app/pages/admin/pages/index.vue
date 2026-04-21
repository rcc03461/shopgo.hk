<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type Row = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published' | 'archived'
  updatedAt: string
  publishedAt: string | null
}

const q = ref('')
const status = ref<'all' | 'draft' | 'published' | 'archived'>('all')
const page = ref(1)
const pageSize = ref(20)
const requestFetch = useRequestFetch()

const { data, pending, refresh, error } = await useAsyncData(
  () => `admin-pages-${page.value}-${pageSize.value}-${status.value}-${q.value.trim() || '-'}`,
  async () =>
    await requestFetch<{
      items: Row[]
      page: number
      pageSize: number
      total: number
    }>('/api/admin/pages', {
      credentials: 'include',
      query: {
        page: page.value,
        pageSize: pageSize.value,
        ...(q.value.trim() ? { q: q.value.trim() } : {}),
        ...(status.value !== 'all' ? { status: status.value } : {}),
      },
    }),
  { watch: [page, pageSize, status] },
)

function statusText(s: Row['status']) {
  if (s === 'published') return '已發佈'
  if (s === 'archived') return '封存'
  return '草稿'
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('zh-HK')
  } catch {
    return iso
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void refresh()
  }, 300)
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">頁面管理</h1>
        <p class="mt-1 text-sm text-neutral-600">
          公開頁面路由：<code class="font-mono text-xs">/p/[page_slug]</code>
        </p>
      </div>
      <NuxtLink
        to="/admin/pages/new"
        class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        新增頁面
      </NuxtLink>
    </div>

    <div class="mt-4 flex max-w-3xl flex-wrap gap-2">
      <input
        v-model="q"
        type="search"
        placeholder="搜尋標題或網址代號…"
        class="min-w-[260px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
        @input="onSearchInput"
      />
      <select
        v-model="status"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
        @change="page = 1; refresh()"
      >
        <option value="all">全部狀態</option>
        <option value="draft">草稿</option>
        <option value="published">已發佈</option>
        <option value="archived">封存</option>
      </select>
    </div>

    <p v-if="error" class="mt-4 text-sm text-red-600">
      無法載入列表，請確認已登入租戶後台。
    </p>

    <div
      v-else
      class="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
    >
      <table class="min-w-full divide-y divide-neutral-200 text-sm">
        <thead class="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
          <tr>
            <th class="px-4 py-3">標題</th>
            <th class="px-4 py-3">Slug</th>
            <th class="px-4 py-3">狀態</th>
            <th class="px-4 py-3">更新</th>
            <th class="px-4 py-3">發佈時間</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-200">
          <tr v-if="pending">
            <td colspan="6" class="px-4 py-6 text-center text-neutral-500">載入中…</td>
          </tr>
          <tr v-else-if="!data?.items.length">
            <td colspan="6" class="px-4 py-6 text-center text-neutral-500">尚無頁面</td>
          </tr>
          <tr v-for="row in data?.items ?? []" :key="row.id" class="hover:bg-neutral-50">
            <td class="px-4 py-3 font-medium text-neutral-900">{{ row.title }}</td>
            <td class="px-4 py-3 font-mono text-xs text-neutral-700">{{ row.slug }}</td>
            <td class="px-4 py-3 text-neutral-700">{{ statusText(row.status) }}</td>
            <td class="px-4 py-3 text-xs text-neutral-600">{{ formatTime(row.updatedAt) }}</td>
            <td class="px-4 py-3 text-xs text-neutral-600">{{ formatTime(row.publishedAt) }}</td>
            <td class="px-4 py-3 text-right">
              <NuxtLink
                :to="`/admin/pages/${row.id}`"
                class="text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
              >
                編輯
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="data && data.total > data.pageSize"
      class="mt-4 flex items-center justify-between text-sm text-neutral-600"
    >
      <span>共 {{ data.total }} 筆</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 disabled:opacity-40"
          :disabled="page <= 1 || pending"
          @click="page--; refresh()"
        >
          上一頁
        </button>
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 disabled:opacity-40"
          :disabled="page * pageSize >= data.total || pending"
          @click="page++; refresh()"
        >
          下一頁
        </button>
      </div>
    </div>
  </div>
</template>
