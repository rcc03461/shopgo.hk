<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')

if (!tenantSlug.value) {
  await navigateTo('/admin/login')
}

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)

async function onSubmit() {
  errorMessage.value = null
  loading.value = true
  try {
    /**
     * Tenant 會員登入 API 尚未接入，
     * 先保留表單與互動，避免路由空缺。
     */
    await new Promise(resolve => setTimeout(resolve, 300))
    throw createError({
      statusCode: 501,
      statusMessage: '租戶會員登入尚未開放',
    })
  } catch (e: unknown) {
    const err = e as {
      data?: { message?: string }
      message?: string
      statusMessage?: string
    }
    errorMessage.value =
      err.data?.message ||
      err.statusMessage ||
      err.message ||
      '登入失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-16 sm:px-6">
    <h1 class="text-xl font-semibold tracking-tight text-neutral-900">
      會員登入
    </h1>
    <p class="mt-2 text-sm text-neutral-600">
      登入 <span class="font-mono">{{ tenantSlug }}</span> 商店會員帳號。
    </p>

    <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="block text-xs font-medium text-neutral-700" for="email">
          電子郵件
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-900 focus:border-neutral-900 focus:ring-1"
        >
      </div>
      <div>
        <label
          class="block text-xs font-medium text-neutral-700"
          for="password"
        >
          密碼
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-900 focus:border-neutral-900 focus:ring-1"
        >
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? '登入中…' : '會員登入' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-neutral-600">
      還沒有會員帳號？
      <NuxtLink to="/register" class="font-medium text-neutral-900 underline">
        前往註冊
      </NuxtLink>
    </p>
    <p class="mt-2 text-center text-xs text-neutral-500">
      若你是商店管理員，請改用
      <NuxtLink to="/admin/login" class="font-medium underline">
        /admin/login
      </NuxtLink>
    </p>
  </div>
</template>
