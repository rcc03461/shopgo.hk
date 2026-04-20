<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type SettingsResponse = {
  shopSlug: string
  settings: Record<string, unknown>
}

const requestFetch = useRequestFetch()
const route = useRoute()

const { data, error, refresh } = await useAsyncData(
  'admin-tenant-shipping-settings',
  async () => {
    return await requestFetch<SettingsResponse>('/api/admin/tenant-settings', {
      credentials: 'include',
    })
  },
)

const originalSettings = ref<Record<string, unknown>>({})

const methodsText = ref('')
const form = reactive({
  name: true,
  email: true,
  phone: true,
  address: true,
  remarks: true,
})

const defaultMethodLines = ['Standard Shipping']

watch(
  () => data.value,
  (v) => {
    if (!v) return
    const settings = v.settings ?? {}
    originalSettings.value = { ...settings }
    const methods = Array.isArray(settings.shippingMethods)
      ? settings.shippingMethods.filter((x): x is string => typeof x === 'string')
      : defaultMethodLines
    methodsText.value = methods.join('\n')

    const shippingForm =
      typeof settings.shippingForm === 'object' && settings.shippingForm
        ? (settings.shippingForm as Record<string, unknown>)
        : {}
    form.name = shippingForm.name === false ? false : true
    form.email = shippingForm.email === false ? false : true
    form.phone = shippingForm.phone === false ? false : true
    form.address = shippingForm.address === false ? false : true
    form.remarks = shippingForm.remarks === false ? false : true
  },
  { immediate: true },
)

const saving = ref(false)
const saveErr = ref<string | null>(null)
const saveOk = ref(false)

function tabClass(path: string): string {
  const active = route.path === path
  return active
    ? 'rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white'
    : 'rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50'
}

function normalizeShippingMethods(text: string): string[] {
  const uniq = new Set<string>()
  for (const raw of text.split('\n')) {
    const value = raw.trim()
    if (!value) continue
    uniq.add(value)
  }
  const list = [...uniq]
  return list.length > 0 ? list : defaultMethodLines
}

async function save() {
  saving.value = true
  saveErr.value = null
  saveOk.value = false
  try {
    await $fetch('/api/admin/tenant-settings', {
      method: 'PATCH',
      credentials: 'include',
      body: {
        settings: {
          ...originalSettings.value,
          shippingMethods: normalizeShippingMethods(methodsText.value),
          shippingForm: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            address: form.address,
            remarks: form.remarks,
          },
        },
      },
    })
    saveOk.value = true
    await refresh()
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    saveErr.value = x?.data?.message || x?.message || '儲存失敗'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl space-y-8">
    <div class="space-y-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">運送設定</h1>
        <p class="mt-2 text-sm text-neutral-600">
          設定付款頁可選的運送方式，與顧客需要填寫的運送資料欄位。
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3">
        <NuxtLink to="/admin/settings" :class="tabClass('/admin/settings')">
          商店設定
        </NuxtLink>
        <NuxtLink to="/admin/settings/payment" :class="tabClass('/admin/settings/payment')">
          收款設定
        </NuxtLink>
        <NuxtLink to="/admin/settings/shipping" :class="tabClass('/admin/settings/shipping')">
          運送設定
        </NuxtLink>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600">
      無法載入設定。
    </p>

    <form v-else class="space-y-6" @submit.prevent="save">
      <p v-if="saveErr" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ saveErr }}
      </p>
      <p v-if="saveOk" class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        已儲存。
      </p>

      <section class="rounded-lg border border-neutral-200 bg-white p-5 space-y-3 shadow-sm">
        <h2 class="text-sm font-semibold text-neutral-900">
          運送方式
        </h2>
        <p class="text-xs text-neutral-500">
          每行一個選項，付款頁會以單選方式顯示。
        </p>
        <textarea
          v-model="methodsText"
          rows="5"
          class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          placeholder="例如：\nStandard Shipping\nExpress Delivery\n門市自取"
        />
      </section>

      <section class="rounded-lg border border-neutral-200 bg-white p-5 space-y-3 shadow-sm">
        <h2 class="text-sm font-semibold text-neutral-900">
          運送表單欄位
        </h2>
        <p class="text-xs text-neutral-500">
          關閉後，付款頁不會顯示該欄位。預設為全部開啟。
        </p>
        <label class="flex items-center gap-2 text-sm text-neutral-800">
          <input v-model="form.name" type="checkbox" class="size-4 rounded border-neutral-300">
          姓名
        </label>
        <label class="flex items-center gap-2 text-sm text-neutral-800">
          <input v-model="form.email" type="checkbox" class="size-4 rounded border-neutral-300">
          Email
        </label>
        <label class="flex items-center gap-2 text-sm text-neutral-800">
          <input v-model="form.phone" type="checkbox" class="size-4 rounded border-neutral-300">
          電話
        </label>
        <label class="flex items-center gap-2 text-sm text-neutral-800">
          <input
            v-model="form.address"
            type="checkbox"
            class="size-4 rounded border-neutral-300"
          >
          地址
        </label>
        <label class="flex items-center gap-2 text-sm text-neutral-800">
          <input
            v-model="form.remarks"
            type="checkbox"
            class="size-4 rounded border-neutral-300"
          >
          備註
        </label>
      </section>

      <button
        type="submit"
        :disabled="saving"
        class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {{ saving ? '儲存中…' : '儲存運送設定' }}
      </button>
    </form>
  </div>
</template>
