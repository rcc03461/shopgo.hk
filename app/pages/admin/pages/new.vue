<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const form = reactive({
  title: '',
  slug: '',
  status: 'draft' as 'draft' | 'published' | 'archived',
  excerpt: '',
  contentMarkdown: '',
  seoTitle: '',
  seoDescription: '',
})

const saving = ref(false)
const err = ref<string | null>(null)

watch(
  () => form.title,
  (v) => {
    if (!form.slug.trim()) {
      form.slug = v
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }
  },
)

async function submit() {
  saving.value = true
  err.value = null
  try {
    const res = await $fetch<{ page: { id: string } }>('/api/admin/pages', {
      method: 'POST',
      credentials: 'include',
      body: {
        ...form,
        excerpt: form.excerpt || null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
      },
    })
    await navigateTo(`/admin/pages/${res.page.id}`)
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || '建立失敗'
  } finally {
    saving.value = false
  }
}

const statusId = useId()
</script>

<template>
  <div class="max-w-3xl">
    <h1 class="text-xl font-semibold tracking-tight">新增頁面</h1>
    <p class="mt-1 text-sm text-neutral-600">建立後可於公開路由 `/p/[page_slug]` 顯示。</p>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <p v-if="err" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ err }}
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

      <div class="flex gap-2 pt-2">
        <button
          type="submit"
          class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="saving"
        >
          {{ saving ? '建立中…' : '建立' }}
        </button>
        <NuxtLink
          to="/admin/pages"
          class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
        >
          返回列表
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
