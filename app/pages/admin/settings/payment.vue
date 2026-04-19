<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type StripeConfig = {
  publishableKey?: string
  mode: 'test' | 'live'
}

type PaypalConfig = {
  clientId?: string
  environment: 'sandbox' | 'live'
}

type ProviderRow =
  | {
      provider: 'stripe'
      enabled: boolean
      displayOrder: number
      config: StripeConfig
      secretHints: { secretKey?: boolean; webhookSecret?: boolean }
    }
  | {
      provider: 'paypal'
      enabled: boolean
      displayOrder: number
      config: PaypalConfig
      secretHints: { clientSecret?: boolean }
    }

type PaymentProvidersResponse = {
  providers: ProviderRow[]
}

const requestFetch = useRequestFetch()
const route = useRoute()

const { data, refresh, error, pending } = await useAsyncData(
  'admin-payment-providers',
  async () => {
    return await requestFetch<PaymentProvidersResponse>('/api/admin/payment-providers', {
      credentials: 'include',
    })
  },
)

const stripe = reactive({
  enabled: false,
  displayOrder: 0,
  publishableKey: '',
  mode: 'test' as 'test' | 'live',
  secretKeyDraft: '',
  webhookSecretDraft: '',
})

const paypal = reactive({
  enabled: false,
  displayOrder: 1,
  clientId: '',
  environment: 'sandbox' as 'sandbox' | 'live',
  clientSecretDraft: '',
})

const stripeHints = reactive({ secretKey: false, webhookSecret: false })
const paypalHints = reactive({ clientSecret: false })

/** 與後端「未送欄位則不變更」對齊，避免空字串誤清已儲存的公開欄位 */
const baseline = reactive({
  stripePublishableKey: '',
  paypalClientId: '',
})

watch(
  () => data.value,
  (v) => {
    if (!v) return
    for (const p of v.providers) {
      if (p.provider === 'stripe') {
        stripe.enabled = p.enabled
        stripe.displayOrder = p.displayOrder
        stripe.publishableKey = p.config.publishableKey ?? ''
        baseline.stripePublishableKey = p.config.publishableKey ?? ''
        stripe.mode = p.config.mode
        stripe.secretKeyDraft = ''
        stripe.webhookSecretDraft = ''
        stripeHints.secretKey = Boolean(p.secretHints.secretKey)
        stripeHints.webhookSecret = Boolean(p.secretHints.webhookSecret)
      } else {
        paypal.enabled = p.enabled
        paypal.displayOrder = p.displayOrder
        paypal.clientId = p.config.clientId ?? ''
        baseline.paypalClientId = p.config.clientId ?? ''
        paypal.environment = p.config.environment
        paypal.clientSecretDraft = ''
        paypalHints.clientSecret = Boolean(p.secretHints.clientSecret)
      }
    }
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

async function saveAll() {
  saving.value = true
  saveErr.value = null
  saveOk.value = false
  try {
    const stripeBody: Record<string, unknown> = {
      enabled: stripe.enabled,
      displayOrder: stripe.displayOrder,
      mode: stripe.mode,
    }
    if (stripe.publishableKey.trim() !== baseline.stripePublishableKey.trim()) {
      stripeBody.publishableKey = stripe.publishableKey.trim() || null
    }
    if (stripe.secretKeyDraft.trim()) {
      stripeBody.secretKey = stripe.secretKeyDraft.trim()
    }
    if (stripe.webhookSecretDraft.trim()) {
      stripeBody.webhookSecret = stripe.webhookSecretDraft.trim()
    }

    const paypalBody: Record<string, unknown> = {
      enabled: paypal.enabled,
      displayOrder: paypal.displayOrder,
      environment: paypal.environment,
    }
    if (paypal.clientId.trim() !== baseline.paypalClientId.trim()) {
      paypalBody.clientId = paypal.clientId.trim() || null
    }
    if (paypal.clientSecretDraft.trim()) {
      paypalBody.clientSecret = paypal.clientSecretDraft.trim()
    }

    await Promise.all([
      $fetch('/api/admin/payment-providers/stripe', {
        method: 'PUT',
        credentials: 'include',
        body: stripeBody,
      }),
      $fetch('/api/admin/payment-providers/paypal', {
        method: 'PUT',
        credentials: 'include',
        body: paypalBody,
      }),
    ])
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
        <h1 class="text-xl font-semibold tracking-tight">收款設定</h1>
        <p class="mt-2 text-sm text-neutral-600">
          設定 Stripe 與 PayPal（Express／Orders API）憑證。密鑰僅伺服器可解密儲存；正式環境請設定
          <code class="rounded bg-neutral-100 px-1 font-mono text-xs">PAYMENT_SECRETS_KEY</code>
          （32 bytes base64）。
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3">
        <NuxtLink
          to="/admin/settings"
          :class="tabClass('/admin/settings')"
        >
          商店設定
        </NuxtLink>
        <NuxtLink
          to="/admin/settings/payment"
          :class="tabClass('/admin/settings/payment')"
        >
          收款設定
        </NuxtLink>
      </div>
    </div>

    <p
      v-if="error"
      class="text-sm text-red-600"
    >
      無法載入設定。
    </p>

    <template v-else>
      <p
        v-if="pending"
        class="text-sm text-neutral-500"
      >
        載入中…
      </p>

      <form
        v-else
        class="space-y-10"
        @submit.prevent="saveAll"
      >
        <p
          v-if="saveErr"
          class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ saveErr }}
        </p>
        <p
          v-if="saveOk"
          class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          已儲存。
        </p>

        <section class="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 class="text-lg font-medium text-neutral-900">Stripe</h2>
          <p class="mt-1 text-sm text-neutral-600">
            用於 PaymentIntents／Checkout；Webhook 密鑰供日後訂單狀態同步。
          </p>

          <label class="mt-6 flex cursor-pointer items-center gap-2 text-sm">
            <input
              v-model="stripe.enabled"
              type="checkbox"
              class="size-4 rounded border-neutral-300"
            />
            啟用 Stripe 收款
          </label>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <label class="block text-sm">
              <span class="font-medium text-neutral-800">模式</span>
              <select
                v-model="stripe.mode"
                class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="test">測試 (test)</option>
                <option value="live">正式 (live)</option>
              </select>
            </label>
            <label class="block text-sm">
              <span class="font-medium text-neutral-800">顯示排序</span>
              <input
                v-model.number="stripe.displayOrder"
                type="number"
                min="0"
                max="99"
                class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label class="mt-4 block text-sm">
            <span class="font-medium text-neutral-800">Publishable key</span>
            <input
              v-model="stripe.publishableKey"
              type="text"
              autocomplete="off"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
              placeholder="pk_test_… 或 pk_live_…"
            />
          </label>

          <label class="mt-4 block text-sm">
            <span class="font-medium text-neutral-800">Secret key</span>
            <input
              v-model="stripe.secretKeyDraft"
              type="password"
              autocomplete="new-password"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
              :placeholder="
                stripeHints.secretKey ? '已設定（留空則不變更）' : 'sk_test_… 或 sk_live_…'
              "
            />
          </label>

          <label class="mt-4 block text-sm">
            <span class="font-medium text-neutral-800">Webhook signing secret</span>
            <input
              v-model="stripe.webhookSecretDraft"
              type="password"
              autocomplete="new-password"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
              :placeholder="
                stripeHints.webhookSecret ? '已設定（留空則不變更）' : 'whsec_…'
              "
            />
          </label>
        </section>

        <section class="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 class="text-lg font-medium text-neutral-900">PayPal</h2>
          <p class="mt-1 text-sm text-neutral-600">
            PayPal Checkout／Orders（REST）；請使用 Developer Dashboard 的 Client ID 與 Secret。
          </p>

          <label class="mt-6 flex cursor-pointer items-center gap-2 text-sm">
            <input
              v-model="paypal.enabled"
              type="checkbox"
              class="size-4 rounded border-neutral-300"
            />
            啟用 PayPal 收款
          </label>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <label class="block text-sm">
              <span class="font-medium text-neutral-800">環境</span>
              <select
                v-model="paypal.environment"
                class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="sandbox">Sandbox</option>
                <option value="live">Live</option>
              </select>
            </label>
            <label class="block text-sm">
              <span class="font-medium text-neutral-800">顯示排序</span>
              <input
                v-model.number="paypal.displayOrder"
                type="number"
                min="0"
                max="99"
                class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label class="mt-4 block text-sm">
            <span class="font-medium text-neutral-800">Client ID</span>
            <input
              v-model="paypal.clientId"
              type="text"
              autocomplete="off"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
            />
          </label>

          <label class="mt-4 block text-sm">
            <span class="font-medium text-neutral-800">Client secret</span>
            <input
              v-model="paypal.clientSecretDraft"
              type="password"
              autocomplete="new-password"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
              :placeholder="paypalHints.clientSecret ? '已設定（留空則不變更）' : 'Secret 字串'"
            />
          </label>
        </section>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            :disabled="saving"
            class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {{ saving ? '儲存中…' : '儲存全部' }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
