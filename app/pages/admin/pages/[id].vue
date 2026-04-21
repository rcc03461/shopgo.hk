<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const id = computed(() => String(route.params.id))
const requestFetch = useRequestFetch()

type Detail = {
  page: {
    id: string
    title: string
    slug: string
    excerpt: string | null
    contentMarkdown: string
    status: 'draft' | 'published' | 'archived'
    seoTitle: string | null
    seoDescription: string | null
    publishedAt: string | null
    updatedAt: string
  }
}

const { data, refresh, error } = await useAsyncData(
  () => `admin-page-detail-${id.value}`,
  async () =>
    await requestFetch<Detail>(`/api/admin/pages/${id.value}`, {
      credentials: 'include',
    }),
  { watch: [id] },
)

const form = reactive({
  title: '',
  slug: '',
  status: 'draft' as 'draft' | 'published' | 'archived',
  excerpt: '',
  contentMarkdown: '',
  seoTitle: '',
  seoDescription: '',
})

watch(
  () => data.value,
  (v) => {
    if (!v?.page) return
    form.title = v.page.title
    form.slug = v.page.slug
    form.status = v.page.status
    form.excerpt = v.page.excerpt ?? ''
    form.contentMarkdown = v.page.contentMarkdown ?? ''
    form.seoTitle = v.page.seoTitle ?? ''
    form.seoDescription = v.page.seoDescription ?? ''
  },
  { immediate: true },
)

const saving = ref(false)
const deleting = ref(false)
const saveErr = ref<string | null>(null)
const statusId = useId()
function formatIsoTime(iso: string) {
  return iso.replace('T', ' ').slice(0, 19)
}

async function save() {
  saving.value = true
  saveErr.value = null
  try {
    await $fetch(`/api/admin/pages/${id.value}`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        ...form,
        excerpt: form.excerpt || null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
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

async function removePage() {
  if (!confirm('確定刪除此頁面？此操作無法復原。')) return
  deleting.value = true
  saveErr.value = null
  try {
    await $fetch(`/api/admin/pages/${id.value}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    await navigateTo('/admin/pages')
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    saveErr.value = x?.data?.message || x?.message || '刪除失敗'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">編輯頁面</h1>
        <p class="mt-1 font-mono text-xs text-neutral-500">id：{{ id }}</p>
      </div>
      <NuxtLink
        to="/admin/pages"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
      >
        返回列表
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-4 text-sm text-red-600">無法載入頁面。</p>

    <form v-else class="mt-6 space-y-4" @submit.prevent="save">
      <p v-if="saveErr" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ saveErr }}
      </p>

      <AdminFormTextInput v-model="form.title" label="標題" required />
      <AdminFormTextInput
        v-model="form.slug"
        label="網址代號（slug）"
        hint="小寫英數與連字號"
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        title="小寫英數與連字號"
        required
        input-class="font-mono"
      />

      <AdminFormField label="狀態" :for-id="statusId">
        <select
          :id="statusId"
          v-model="form.status"
          class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="draft">草稿</option>
          <option value="published">已發佈</option>
          <option value="archived">封存</option>
        </select>
      </AdminFormField>

      <AdminFormTextarea v-model="form.excerpt" label="摘要" :rows="3" />
      <AdminFormField label="內容（Markdown）">
        <AdminFormMilkdownEditor v-model="form.contentMarkdown" />
      </AdminFormField>
      <AdminFormTextInput v-model="form.seoTitle" label="SEO 標題（可留空）" />
      <AdminFormTextarea v-model="form.seoDescription" label="SEO 描述（可留空）" :rows="3" />

      <p v-if="data?.page?.updatedAt" class="text-xs text-neutral-500">
        最後更新：{{ formatIsoTime(data.page.updatedAt) }}
      </p>

      <div class="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="saving || deleting"
        >
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
        <button
          type="button"
          class="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          :disabled="saving || deleting"
          @click="removePage"
        >
          {{ deleting ? '刪除中…' : '刪除' }}
        </button>
      </div>
    </form>
  </div>
</template>
