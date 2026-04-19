<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const tenantSlug = useState<string | null>('oshop-tenant-slug')

async function onSubmit() {
  errorMessage.value = null
  loading.value = true
  try {
    const res = await $fetch<{
      ok: true
      tenant: { shopSlug: string }
      user: { email: string }
    }>('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })

    if (tenantSlug.value) {
      const redirect =
        typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
          ? route.query.redirect
          : '/admin/dashboard'
      await navigateTo(redirect)
      return
    }

    const adminUrl = useTenantAdminEntryUrl(res.tenant.shopSlug)
    await navigateTo(adminUrl, { external: true })
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
      管理員登入
    </h1>
    <p class="mt-2 text-sm text-neutral-600">
      <template v-if="tenantSlug">
        登入 <span class="font-mono">{{ tenantSlug }}</span> 商店管理帳號。
      </template>
      <template v-else>
        使用註冊時的電子郵件與密碼登入；成功後將前往該商店的後台總覽。
      </template>
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
        {{ loading ? '登入中…' : '登入' }}
      </button>
    </form>

    <p v-if="!tenantSlug" class="mt-6 text-center text-sm text-neutral-600">
      還沒有商店帳號？
      <NuxtLink to="/admin/register" class="font-medium text-neutral-900 underline">
        前往開店註冊
      </NuxtLink>
    </p>
  </div>
</template>
