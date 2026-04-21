<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

type PagePayload = {
  page: {
    title: string
    slug: string
    excerpt: string | null
    contentHtml: string
    seoTitle: string | null
    seoDescription: string | null
    publishedAt: string | null
  }
}

const route = useRoute()
const slug = computed(() => String(route.params.page_slug || '').trim())
const requestFetch = useRequestFetch()

const { data, error, pending } = await useAsyncData(
  () => `store-page-${slug.value}`,
  async () =>
    await requestFetch<PagePayload>(
      `/api/store/pages/${encodeURIComponent(slug.value)}`,
    ),
  { watch: [slug] },
)

const pageTitle = computed(() => data.value?.page.seoTitle || data.value?.page.title || '頁面')
const pageDescription = computed(
  () => data.value?.page.seoDescription || data.value?.page.excerpt || '',
)

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <p v-if="error" class="text-sm text-red-600">{{ error.message || '找不到頁面' }}</p>
    <p v-else-if="pending" class="text-sm text-neutral-500">載入中…</p>
    <article v-else-if="data?.page" class="prose prose-neutral max-w-none">
      <h1>{{ data.page.title }}</h1>
      <p v-if="data.page.excerpt" class="text-neutral-600">{{ data.page.excerpt }}</p>
      <div v-html="data.page.contentHtml" />
    </article>
  </div>
</template>
