<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const id = computed(() => String(route.params.id))

type Line = {
  id: string
  productId: string
  productVariantId: string | null
  titleSnapshot: string
  skuSnapshot: string
  unitPrice: string
  quantity: number
  lineTotal: string
}

type Detail = {
  order: {
    id: string
    invoicePublicId: string
    status: string
    paymentProvider: string | null
    paymentReference: string | null
    currency: string
    subtotal: string
    total: string
    customerEmail: string | null
    shippingData: Record<string, unknown> | null
    createdAt: string
    updatedAt: string
  }
  lines: Line[]
}

const requestFetch = useRequestFetch()

const { data, error, refresh } = await useAsyncData(
  () => `admin-order-detail-${id.value}`,
  async () => {
    return await requestFetch<Detail>(`/api/admin/orders/${id.value}`, {
      credentials: 'include',
    })
  },
  { watch: [id] },
)

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-HK')
  } catch {
    return iso
  }
}

function formatMoney(amount: string, currency: string) {
  const n = Number(amount)
  if (Number.isNaN(n)) return amount
  try {
    return new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency: currency || 'HKD',
    }).format(n)
  } catch {
    return `${amount} ${currency}`
  }
}

function statusLabel(s: string) {
  if (s === 'paid') return '已付款'
  if (s === 'pending_payment') return '待付款'
  if (s === 'payment_failed') return '付款失敗'
  return s
}

function statusPillClass(s: string) {
  if (s === 'paid') return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  if (s === 'pending_payment') return 'bg-amber-50 text-amber-900 ring-amber-200'
  if (s === 'payment_failed') return 'bg-red-50 text-red-800 ring-red-200'
  return 'bg-neutral-100 text-neutral-800 ring-neutral-200'
}

function providerLabel(p: string | null) {
  if (!p) return '—'
  if (p === 'stripe') return 'Stripe'
  if (p === 'paypal') return 'PayPal'
  return p
}

function shippingField(v: unknown) {
  return typeof v === 'string' && v.trim() ? v.trim() : '—'
}

const statusDraft = ref<'pending_payment' | 'paid' | 'payment_failed'>(
  'pending_payment',
)
const savingStatus = ref(false)
const saveStatusErr = ref<string | null>(null)
const saveStatusOk = ref(false)

watch(
  () => data.value?.order.status,
  (v) => {
    if (!v) return
    if (v === 'pending_payment' || v === 'paid' || v === 'payment_failed') {
      statusDraft.value = v
    }
  },
  { immediate: true },
)

async function saveStatus() {
  if (!data.value) return
  savingStatus.value = true
  saveStatusErr.value = null
  saveStatusOk.value = false
  try {
    await $fetch(`/api/admin/orders/${data.value.order.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { status: statusDraft.value },
    })
    await refresh()
    saveStatusOk.value = true
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    saveStatusErr.value = x?.data?.message || x?.message || '更新狀態失敗'
  } finally {
    savingStatus.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/admin/orders"
        class="text-sm text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
      >
        ← 返回訂單列表
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-6 text-sm text-red-600">
      無法載入訂單（可能不存在或無權限）。
    </p>

    <template v-else-if="data">
      <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold tracking-tight">
            訂單詳情
          </h1>
          <p class="mt-1 font-mono text-xs text-neutral-500">
            {{ data.order.id }}
          </p>
        </div>
        <span
          class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset"
          :class="statusPillClass(data.order.status)"
        >
          {{ statusLabel(data.order.status) }}
        </span>
      </div>

      <dl
        class="mt-8 grid gap-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-2"
      >
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            建立時間
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ formatTime(data.order.createdAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            最後更新
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ formatTime(data.order.updatedAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            發票公開 ID
          </dt>
          <dd class="mt-1 break-all font-mono text-sm text-neutral-900">
            {{ data.order.invoicePublicId }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            顧客電郵
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ data.order.customerEmail || '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            收款方式
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ providerLabel(data.order.paymentProvider) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            外部參考
          </dt>
          <dd class="mt-1 break-all font-mono text-xs text-neutral-800">
            {{ data.order.paymentReference || '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            小計
          </dt>
          <dd class="mt-1 text-sm font-medium text-neutral-900">
            {{ formatMoney(data.order.subtotal, data.order.currency) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            總計
          </dt>
          <dd class="mt-1 text-lg font-semibold text-neutral-900">
            {{ formatMoney(data.order.total, data.order.currency) }}
          </dd>
        </div>
      </dl>

      <section
        v-if="data.order.shippingData"
        class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <h2 class="text-base font-semibold text-neutral-900">
          運送資料
        </h2>
        <dl class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              運送方式
            </dt>
            <dd class="mt-1 text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.method) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              收件人
            </dt>
            <dd class="mt-1 text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.name) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              運送 Email
            </dt>
            <dd class="mt-1 text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.email) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              電話
            </dt>
            <dd class="mt-1 text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.phone) }}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              地址
            </dt>
            <dd class="mt-1 whitespace-pre-line text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.address) }}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              備註
            </dt>
            <dd class="mt-1 whitespace-pre-line text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.remarks) }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-semibold text-neutral-900">
          訂單狀態
        </h2>
        <p class="mt-1 text-sm text-neutral-600">
          可手動修正狀態（例如線下確認收款）。
        </p>
        <p
          v-if="saveStatusErr"
          class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ saveStatusErr }}
        </p>
        <p
          v-if="saveStatusOk"
          class="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          訂單狀態已更新。
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <select
            v-model="statusDraft"
            class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="pending_payment">
              待付款
            </option>
            <option value="paid">
              已付款
            </option>
            <option value="payment_failed">
              付款失敗
            </option>
          </select>
          <button
            type="button"
            :disabled="savingStatus || statusDraft === data.order.status"
            class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            @click="saveStatus"
          >
            {{ savingStatus ? '更新中…' : '更新狀態' }}
          </button>
        </div>
      </section>

      <section class="mt-8">
        <h2 class="text-base font-semibold text-neutral-900">
          明細
        </h2>
        <div
          class="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
        >
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200 text-sm">
              <thead class="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th class="px-4 py-3">
                    品項
                  </th>
                  <th class="px-4 py-3">
                    SKU
                  </th>
                  <th class="whitespace-nowrap px-4 py-3 text-right">
                    單價
                  </th>
                  <th class="whitespace-nowrap px-4 py-3 text-right">
                    數量
                  </th>
                  <th class="whitespace-nowrap px-4 py-3 text-right">
                    小計
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200">
                <tr v-if="!data.lines.length">
                  <td colspan="5" class="px-4 py-6 text-center text-neutral-500">
                    無明細
                  </td>
                </tr>
                <tr
                  v-for="line in data.lines"
                  :key="line.id"
                  class="hover:bg-neutral-50"
                >
                  <td class="px-4 py-3 font-medium text-neutral-900">
                    {{ line.titleSnapshot }}
                  </td>
                  <td class="px-4 py-3 font-mono text-xs text-neutral-700">
                    {{ line.skuSnapshot }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-right text-neutral-700">
                    {{ formatMoney(line.unitPrice, data.order.currency) }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-right text-neutral-700">
                    {{ line.quantity }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-right font-medium text-neutral-900">
                    {{ formatMoney(line.lineTotal, data.order.currency) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
