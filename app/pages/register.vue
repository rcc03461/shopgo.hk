<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const config = useRuntimeConfig()

/** 開店註冊僅在主網域提供，避免在子網域誤開第二間店 */
if (tenantSlug.value) {
  const url = useRequestURL()
  const root = config.public.tenantRootDomain as string
  const port = url.port ? `:${url.port}` : ''
  await navigateTo(`${url.protocol}//${root}${port}/register`, {
    external: true,
  })
}

const shopSlug = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
async function onSubmit() {
  errorMessage.value = null
  loading.value = true
  try {
    const res = await $fetch<{
      ok: true
      tenant: { shopSlug: string }
      user: { email: string }
    }>('/api/auth/register', {
      method: 'POST',
      body: {
        shopSlug: shopSlug.value.trim().toLowerCase(),
        email: email.value,
        password: password.value,
      },
    })

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
      '註冊失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-16 sm:px-6">
    <h1 class="text-xl font-semibold tracking-tight text-neutral-900">
      開店註冊
    </h1>
    <p class="mt-2 text-sm text-neutral-600">
      建立商店代號與管理員帳號。完成後可造訪
      <span class="font-mono text-neutral-800">{{ shopSlug || 'your-shop' }}.oshop.com.hk</span>
    </p>

    <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
      <div>
        <label
          class="block text-xs font-medium text-neutral-700"
          for="shopSlug"
        >
          商店代號（子網域）
        </label>
        <input
          id="shopSlug"
          v-model="shopSlug"
          type="text"
          autocomplete="off"
          autocapitalize="none"
          required
          placeholder="例如 my-boutique"
          class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-900 focus:border-neutral-900 focus:ring-1"
        >
        <p class="mt-1 text-xs text-neutral-500">
          僅限小寫英文、數字與連字號；註冊後會成為子網域前綴。
        </p>
      </div>
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
          autocomplete="new-password"
          required
          minlength="8"
          class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-900 focus:border-neutral-900 focus:ring-1"
        >
        <p class="mt-1 text-xs text-neutral-500">至少 8 字元。</p>
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        :disabled="loading"
      >
        {{ loading ? '建立中…' : '建立商店' }}
      </button>
    </form>

    <p v-if="!tenantSlug" class="mt-6 text-center text-sm text-neutral-600">
      已經有帳號？
      <NuxtLink to="/login" class="font-medium text-neutral-900 underline">
        登入
      </NuxtLink>
    </p>
  </div>
</template>
