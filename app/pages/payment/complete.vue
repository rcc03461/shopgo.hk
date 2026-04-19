<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const route = useRoute()
const { clearCart } = useStoreCart()

const status = ref<'loading' | 'ok' | 'err'>('loading')
const message = ref('')
const invoicePublicId = ref<string | null>(null)

onMounted(async () => {
  if (!tenantSlug.value) {
    status.value = 'err'
    message.value = '請以商店子網域開啟此頁'
    return
  }

  const orderId = typeof route.query.orderId === 'string' ? route.query.orderId : ''
  const prov = route.query.provider === 'paypal' ? 'paypal' : 'stripe'

  if (!orderId) {
    status.value = 'err'
    message.value = '缺少訂單資訊'
    return
  }

  status.value = 'loading'
  message.value = ''

  try {
    if (prov === 'stripe') {
      const sessionId =
        typeof route.query.session_id === 'string' ? route.query.session_id : ''
      if (!sessionId) {
        throw new Error('缺少 Stripe 工作階段')
      }
      const res = await $fetch<{ ok: true; invoicePublicId: string; alreadyCompleted?: boolean }>(
        '/api/store/payment/complete',
        {
          method: 'POST',
          body: { provider: 'stripe', orderId, sessionId },
        },
      )
      invoicePublicId.value = res.invoicePublicId
    } else {
      const token = typeof route.query.token === 'string' ? route.query.token : ''
      if (!token) {
        throw new Error('缺少 PayPal 訂單代碼')
      }
      const res = await $fetch<{ ok: true; invoicePublicId: string }>(
        '/api/store/payment/complete',
        {
          method: 'POST',
          body: { provider: 'paypal', orderId, paypalOrderId: token },
        },
      )
      invoicePublicId.value = res.invoicePublicId
    }
    clearCart()
    status.value = 'ok'
    message.value = '付款完成，感謝購買！'
  } catch (e: unknown) {
    status.value = 'err'
    const dataMsg =
      e &&
      typeof e === 'object' &&
      'data' in e &&
      (e as { data?: { message?: string } }).data &&
      typeof (e as { data: { message?: string } }).data.message === 'string'
        ? (e as { data: { message: string } }).data.message
        : ''
    message.value =
      dataMsg ||
      (e instanceof Error ? e.message : '') ||
      '確認付款失敗，請聯絡商店或重試'
  }
})
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
    <template v-if="status === 'loading'">
      <p class="text-sm text-neutral-600">
        正在確認付款結果…
      </p>
    </template>
    <template v-else-if="status === 'ok'">
      <p class="text-lg font-semibold text-neutral-900">
        {{ message }}
      </p>
      <p v-if="invoicePublicId" class="mt-4 text-sm text-neutral-600">
        訂單編號（發票用）：
        <span class="font-mono text-neutral-900">{{ invoicePublicId }}</span>
      </p>
      <div class="mt-10 flex flex-wrap justify-center gap-3">
        <NuxtLink
          to="/products"
          class="inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          繼續購物
        </NuxtLink>
        <NuxtLink
          to="/"
          class="inline-flex rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
        >
          返回首頁
        </NuxtLink>
      </div>
    </template>
    <template v-else>
      <p class="text-lg font-semibold text-red-700">
        無法完成確認
      </p>
      <p class="mt-2 text-sm text-neutral-600">
        {{ message }}
      </p>
      <NuxtLink
        to="/cart"
        class="mt-8 inline-block text-sm font-medium text-neutral-900 underline"
      >
        返回購物車
      </NuxtLink>
    </template>
  </div>
</template>
