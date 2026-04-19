<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const form = reactive({
  title: '',
  slug: '',
  description: '',
  basePrice: '0',
  imageUrlsText: '',
})

const saving = ref(false)
const err = ref<string | null>(null)

async function submit() {
  saving.value = true
  err.value = null
  const imageUrls = form.imageUrlsText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  try {
    const res = await $fetch<{ product: { id: string } }>('/api/admin/products', {
      method: 'POST',
      credentials: 'include',
      body: {
        title: form.title,
        slug: form.slug,
        description: form.description || null,
        basePrice: form.basePrice,
        imageUrls,
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
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="小寫英數與連字號"
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
