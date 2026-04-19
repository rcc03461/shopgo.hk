<script setup lang="ts">
import { formatHkd } from '~/utils/formatHkd'

definePageMeta({
  layout: 'default',
})

type PayOption = {
  code: string
  enabled: boolean
  displayOrder: number
  stripePublishableKey?: string
  stripeMode?: string
  paypalClientId?: string
  paypalEnvironment?: string
}

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const { lines, subtotalMoney } = useStoreCart()
const requestFetch = useRequestFetch()

const customerEmail = ref('')
const provider = ref<'stripe' | 'paypal' | ''>('')
const busy = ref(false)
const err = ref<string | null>(null)

const { data: optionsData } = await useAsyncData(
  'store-payment-options',
  () =>
    tenantSlug.value
      ? requestFetch<{ providers: PayOption[] }>('/api/store/payment-options')
      : Promise.resolve({ providers: [] as PayOption[] }),
  { watch: [tenantSlug] },
)

const enabledProviders = computed(() =>
  (optionsData.value?.providers ?? []).filter((p) => p.enabled),
)

watch(
  enabledProviders,
  (list) => {
    if (!provider.value && list.length > 0) {
      provider.value = list[0]!.code as 'stripe' | 'paypal'
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (tenantSlug.value && lines.value.length === 0) {
    void navigateTo('/cart')
  }
})

async function submitCheckout() {
  err.value = null
  if (!tenantSlug.value) return
  if (lines.value.length === 0) {
    void navigateTo('/cart')
    return
  }
  if (!provider.value) {
    err.value = '請選擇付款方式'
    return
  }
  busy.value = true
  try {
    const res = await requestFetch<{
      ok: true
      redirectUrl: string
    }>('/api/store/checkout', {
      method: 'POST',
      body: {
        provider: provider.value,
        customerEmail: customerEmail.value.trim() || undefined,
        items: lines.value.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          quantity: l.qty,
        })),
      },
    })
    if (res.redirectUrl) {
      window.location.href = res.redirectUrl
    }
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'data' in e
        ? String((e as { data?: { message?: string } }).data?.message ?? '')
        : ''
    err.value = msg || (e instanceof Error ? e.message : '結帳失敗')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-10 sm:px-6">
    <div v-if="!tenantSlug" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
      <p class="font-medium">目前網址不是商店子網域</p>
    </div>

    <template v-else>
      <h1 class="text-2xl font-semibold tracking-tight text-neutral-900">
        付款
      </h1>
      <p class="mt-2 text-sm text-neutral-600">
        確認訂單內容後，將導向第三方金流（Stripe 或 PayPal）完成付款。
      </p>

      <NuxtLink
        to="/cart"
        class="mt-4 inline-block text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
      >
        ← 返回購物車
      </NuxtLink>

      <section v-if="lines.length > 0" class="mt-10 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-neutral-900">
          訂單明細
        </h2>
        <ul class="mt-4 divide-y divide-neutral-100 text-sm">
          <li
            v-for="line in lines"
            :key="`${line.productId}:${line.variantId ?? ''}`"
            class="flex justify-between gap-4 py-2"
          >
            <span class="text-neutral-700">{{ line.title }} × {{ line.qty }}</span>
            <span class="shrink-0 font-medium text-neutral-900">
              {{ formatHkd(String(Number(line.unitPrice) * line.qty)) }}
            </span>
          </li>
        </ul>
        <p class="mt-4 border-t border-neutral-200 pt-4 text-right text-base font-semibold text-neutral-900">
          合計 {{ formatHkd(subtotalMoney) }}
        </p>
      </section>

      <form v-if="lines.length > 0" class="mt-8 space-y-6" @submit.prevent="submitCheckout">
        <div>
          <label class="block text-sm font-medium text-neutral-800">聯絡 Email（選填）</label>
          <input
            v-model="customerEmail"
            type="email"
            autocomplete="email"
            class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="用於寄送訂單確認（可留空）"
          >
        </div>

        <div>
          <span class="block text-sm font-medium text-neutral-800">付款方式</span>
          <div v-if="enabledProviders.length === 0" class="mt-2 text-sm text-amber-800">
            商店尚未啟用任何金流，請聯絡店長於後台設定 Stripe 或 PayPal。
          </div>
          <div v-else class="mt-2 flex flex-col gap-2">
            <label
              v-for="p in enabledProviders"
              :key="p.code"
              class="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-50"
            >
              <input
                v-model="provider"
                type="radio"
                class="size-4"
                :value="p.code"
              >
              <span>{{ p.code === 'stripe' ? 'Stripe' : 'PayPal' }}</span>
              <span v-if="p.code === 'paypal' && p.paypalEnvironment" class="text-xs text-neutral-500">
                （{{ p.paypalEnvironment }}）
              </span>
              <span v-if="p.code === 'stripe' && p.stripeMode" class="text-xs text-neutral-500">
                （{{ p.stripeMode }}）
              </span>
            </label>
          </div>
        </div>

        <p v-if="err" class="text-sm text-red-600">
          {{ err }}
        </p>

        <button
          type="submit"
          class="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          :disabled="busy || enabledProviders.length === 0"
        >
          {{ busy ? '處理中…' : '前往安全結帳頁' }}
        </button>
      </form>
    </template>
  </div>
</template>
