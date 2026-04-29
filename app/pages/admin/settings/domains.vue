<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type CustomDomainItem = {
  id: string
  hostname: string
  /** 是否已在 Cloudflare Custom Hostnames 建立（需 CLOUDFLARE_* 環境變數） */
  cfLinked?: boolean
  verifiedAt: string | null
  createdAt: string
}

type ListResponse = {
  items: CustomDomainItem[]
}

type CreateResponse = {
  id: string
  hostname: string
  verifiedAt: null
  verificationToken: string
  cfLinked?: boolean
  cloudflareSyncError?: string
}

const requestFetch = useRequestFetch()
const route = useRoute()
const config = useRuntimeConfig()

const saasCnameTarget = computed(() =>
  String(config.public.saasCnameTarget || '').trim(),
)
const saasSupportDocUrl = computed(() =>
  String(config.public.saasSupportDocUrl || '').trim(),
)

function txtHostFor(hostname: string): string {
  return `_oshop-verify.${hostname}`
}

async function copyPlainText(text: string, okMsg: string) {
  if (!import.meta.client) return
  try {
    await navigator.clipboard.writeText(text)
    actionOk.value = okMsg
    actionErr.value = null
  } catch {
    actionErr.value = '無法複製到剪貼簿，請手動選取。'
  }
}

const { data, refresh, error, pending } = await useAsyncData(
  'admin-custom-domains',
  async () => {
    return await requestFetch<ListResponse>('/api/admin/custom-domains', {
      credentials: 'include',
    })
  },
)

const loadErrMessage = computed(() => {
  const e = error.value as
    | { data?: { message?: string }; message?: string }
    | null
    | undefined
  return e?.data?.message || e?.message || '無法載入自訂網域。'
})

function tabClass(path: string): string {
  const active = route.path === path
  return active
    ? 'rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white'
    : 'rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50'
}

const newHostname = ref('')
const adding = ref(false)
const addErr = ref<string | null>(null)
/** 新增成功後顯示 DNS 指示（token 僅此時可看見） */
const dnsHint = ref<{
  id: string
  hostname: string
  verificationToken: string
} | null>(null)

const actionErr = ref<string | null>(null)
const actionOk = ref<string | null>(null)
const busyId = ref<string | null>(null)

const saasDcvDelegationSuffix = computed(() =>
  String(
    (config.public as { saasDcvDelegationSuffix?: string }).saasDcvDelegationSuffix ||
      '',
  ).trim(),
)

/** DNS 表用：剛新增的提示 → 輸入框 → 列表首筆未驗證 */
const guideHostname = computed(() => {
  if (dnsHint.value?.hostname) return dnsHint.value.hostname
  const t = newHostname.value.trim()
  if (t) return t
  const items = data.value?.items
  const pending = items?.find((i) => !i.verifiedAt)
  return pending?.hostname ?? ''
})

const tableDcvTarget = computed(() => {
  const h = guideHostname.value
  const s = saasDcvDelegationSuffix.value
  if (!h || !s) return ''
  return `${h}.${s}`
})

const tableAcmeName = computed(() => {
  const h = guideHostname.value
  return h ? `_acme-challenge.${h}` : ''
})

const tableTxtName = computed(() => {
  const h = guideHostname.value
  return h ? txtHostFor(h) : ''
})

const tableTxtValuePreview = computed(() => dnsHint.value?.verificationToken ?? '')

function copyTrafficTarget() {
  const t = saasCnameTarget.value
  if (!t) {
    actionErr.value = '平台尚未設定 CNAME 目標，請聯絡客服。'
    actionOk.value = null
    return
  }
  void copyPlainText(t, '流量 CNAME 目標已複製。')
}

function copyDcvName() {
  const n = tableAcmeName.value
  if (!n) {
    actionErr.value = '請先在下方輸入完整網域或新增網域。'
    actionOk.value = null
    return
  }
  void copyPlainText(n, 'HTTPS 驗證主機名已複製。')
}

function copyDcvTargetRow() {
  const t = tableDcvTarget.value
  if (!t) {
    actionErr.value =
      '請填入主機名並由平台設定 DCV 後綴，或到 Cloudflare Custom Hostname 詳情手動複製驗證目標。'
    actionOk.value = null
    return
  }
  void copyPlainText(t, 'HTTPS 驗證目標已複製。')
}

function copyTableTxtName() {
  const n = tableTxtName.value
  if (!n) {
    actionErr.value = '請先輸入完整網域名稱。'
    actionOk.value = null
    return
  }
  void copyPlainText(n, 'TXT 主機名已複製。')
}

function copyTableTxtValue() {
  const v = tableTxtValuePreview.value
  if (!v) {
    actionErr.value = '請先「新增網域」取得驗證碼（僅新增當下顯示）。'
    actionOk.value = null
    return
  }
  void copyPlainText(v, 'TXT 驗證碼已複製。')
}

function errMessage(e: unknown): string {
  const x = e as { data?: { message?: string }; message?: string }
  return x?.data?.message || x?.message || '操作失敗'
}

async function addDomain() {
  adding.value = true
  addErr.value = null
  actionErr.value = null
  actionOk.value = null
  const hostname = newHostname.value.trim()
  if (!hostname) {
    addErr.value = '請輸入網域名稱'
    adding.value = false
    return
  }
  try {
    const res = await $fetch<CreateResponse>('/api/admin/custom-domains', {
      method: 'POST',
      credentials: 'include',
      body: { hostname },
    })
    newHostname.value = ''
    dnsHint.value = {
      id: res.id,
      hostname: res.hostname,
      verificationToken: res.verificationToken,
    }
    if (res.cloudflareSyncError) {
      actionOk.value = `已儲存網域。Cloudflare 同步失敗：${res.cloudflareSyncError}`
    } else if (res.cfLinked) {
      actionOk.value = '已新增；Cloudflare 已註冊 Custom Hostname，請依下方完成 DNS（CNAME／DCV／TXT）。'
    } else {
      actionOk.value = '已新增，請依下方說明完成 DNS 驗證。'
    }
    await refresh()
  } catch (e: unknown) {
    addErr.value = errMessage(e)
  } finally {
    adding.value = false
  }
}

async function verifyDomain(id: string) {
  busyId.value = id
  actionErr.value = null
  actionOk.value = null
  try {
    const res = await $fetch<{ ok: boolean; alreadyVerified?: boolean; verifiedAt?: string }>(
      `/api/admin/custom-domains/${id}/verify`,
      { method: 'POST', credentials: 'include' },
    )
    if (res.alreadyVerified) {
      actionOk.value = '此網域先前已完成驗證。'
    } else {
      actionOk.value = '驗證成功，網域已生效。'
    }
    if (dnsHint.value?.id === id) {
      dnsHint.value = null
    }
    await refresh()
  } catch (e: unknown) {
    actionErr.value = errMessage(e)
  } finally {
    busyId.value = null
  }
}

async function removeDomain(id: string) {
  if (!window.confirm('確定要移除此自訂網域？已驗證的網址將無法再指向本商店。')) {
    return
  }
  busyId.value = id
  actionErr.value = null
  actionOk.value = null
  try {
    await $fetch(`/api/admin/custom-domains/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (dnsHint.value?.id === id) {
      dnsHint.value = null
    }
    actionOk.value = '已移除。'
    await refresh()
  } catch (e: unknown) {
    actionErr.value = errMessage(e)
  } finally {
    busyId.value = null
  }
}

const txtRecordName = computed(() =>
  dnsHint.value ? `_oshop-verify.${dnsHint.value.hostname}` : '',
)

async function copyToken() {
  if (!dnsHint.value || !import.meta.client) return
  await copyPlainText(dnsHint.value.verificationToken, '驗證碼已複製到剪貼簿。')
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('zh-Hant', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="max-w-4xl space-y-8">
    <div class="space-y-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">
          自訂網域
        </h1>
        <p class="mt-2 text-sm text-neutral-600">
          完成下方步驟後，顧客可用你的網址造訪商店。請依序處理：<strong>流量導向（CNAME）</strong>、
          <strong>HTTPS 憑證</strong>（若平台使用 Cloudflare for SaaS）、以及 <strong>本頁的商店歸屬驗證（TXT）</strong>——三層都完成，網址與 HTTPS 才會正常。
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
        <NuxtLink to="/admin/settings/domains" :class="tabClass('/admin/settings/domains')">
          自訂網域
        </NuxtLink>
      </div>
    </div>

    <details
      open
      class="rounded-lg border border-sky-200 bg-sky-50/60 shadow-sm"
    >
      <summary
        class="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-sky-950 [&::-webkit-details-marker]:hidden"
      >
        <span class="underline decoration-dotted">操作指引（請依序完成）</span>
        <span class="ml-2 text-xs font-normal text-sky-800/90">展開／收合</span>
      </summary>
      <div class="space-y-4 border-t border-sky-200/80 px-4 pb-4 pt-3 text-sm text-sky-950">
        <p
          v-if="saasSupportDocUrl"
          class="text-xs"
        >
          更多說明：
          <a
            :href="saasSupportDocUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-sky-800 underline hover:text-sky-950"
          >開啟平台說明</a>
        </p>

        <p class="text-xs text-sky-900/90">
          多數情況需在網域 DNS <strong>新增下列三筆</strong>（可全選複製欄位）。DNS 後台用詞可能是「類型／主機／目標／值」。
          <span
            v-if="guideHostname"
            class="mt-1 block font-mono text-[0.7rem] text-sky-950"
          >目前表格依此主機名產生：<strong>{{ guideHostname }}</strong></span>
        </p>

        <div class="overflow-x-auto rounded-md border border-sky-200/80 bg-white/90">
          <table class="w-full min-w-[32rem] text-left text-xs text-sky-950">
            <thead>
              <tr class="border-b border-sky-200 bg-sky-100/60">
                <th class="px-3 py-2 font-semibold whitespace-nowrap">
                  #
                </th>
                <th class="px-3 py-2 font-semibold whitespace-nowrap">
                  用途
                </th>
                <th class="px-3 py-2 font-semibold whitespace-nowrap">
                  類型
                </th>
                <th class="px-3 py-2 font-semibold">
                  主機／名稱（貼到 DNS）
                </th>
                <th class="px-3 py-2 font-semibold">
                  目標／內容
                </th>
                <th class="px-3 py-2 font-semibold whitespace-nowrap">
                  複製
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sky-100">
              <tr class="align-top">
                <td class="px-3 py-2.5 whitespace-nowrap text-neutral-500">
                  1
                </td>
                <td class="px-3 py-2.5">
                  流量 → 平台
                </td>
                <td class="px-3 py-2.5 whitespace-nowrap">
                  CNAME
                </td>
                <td class="px-3 py-2.5 text-neutral-700">
                  你的子網域前綴<br>
                  <span class="text-[0.65rem] text-neutral-500">（例：<code class="rounded bg-neutral-100 px-0.5">shop</code> 對應 <code class="rounded bg-neutral-100 px-0.5">shop.你的網域</code>）</span>
                </td>
                <td class="px-3 py-2.5 break-all font-mono text-[0.7rem]">
                  <template v-if="saasCnameTarget">{{ saasCnameTarget }}</template>
                  <template v-else>
                    <span class="text-amber-800">請向平台索取（Fallback Origin）</span>
                  </template>
                </td>
                <td class="px-3 py-2.5">
                  <button
                    type="button"
                    class="text-sky-800 underline hover:text-sky-950 disabled:opacity-50"
                    :disabled="!saasCnameTarget"
                    @click="copyTrafficTarget"
                  >
                    目標
                  </button>
                </td>
              </tr>
              <tr class="align-top">
                <td class="px-3 py-2.5 whitespace-nowrap text-neutral-500">
                  2
                </td>
                <td class="px-3 py-2.5">
                  HTTPS 驗證
                </td>
                <td class="px-3 py-2.5 whitespace-nowrap">
                  CNAME
                </td>
                <td class="px-3 py-2.5 break-all font-mono text-[0.7rem]">
                  <template v-if="tableAcmeName">{{ tableAcmeName }}</template>
                  <template v-else>
                    <span class="text-neutral-500">（先輸入主機名）</span>
                  </template>
                  <p class="mt-1 font-sans text-[0.65rem] text-neutral-500">
                    部分廠商需改填
                    <code class="rounded bg-neutral-100 px-0.5">_acme-challenge.子網域</code>
                  </p>
                </td>
                <td class="px-3 py-2.5 break-all font-mono text-[0.7rem]">
                  <template v-if="tableDcvTarget">{{ tableDcvTarget }}</template>
                  <template v-else>
                    <span class="text-neutral-500">（主機名 + 平台 DCV 後綴，或見 Cloudflare）</span>
                  </template>
                </td>
                <td class="px-3 py-2.5 whitespace-nowrap">
                  <button
                    type="button"
                    class="mr-2 text-sky-800 underline hover:text-sky-950 disabled:opacity-50"
                    :disabled="!tableAcmeName"
                    @click="copyDcvName"
                  >
                    主機
                  </button>
                  <button
                    type="button"
                    class="text-sky-800 underline hover:text-sky-950 disabled:opacity-50"
                    :disabled="!tableDcvTarget"
                    @click="copyDcvTargetRow"
                  >
                    目標
                  </button>
                </td>
              </tr>
              <tr class="align-top">
                <td class="px-3 py-2.5 whitespace-nowrap text-neutral-500">
                  3
                </td>
                <td class="px-3 py-2.5">
                  商店驗證
                </td>
                <td class="px-3 py-2.5 whitespace-nowrap">
                  TXT
                </td>
                <td class="px-3 py-2.5 break-all font-mono text-[0.7rem]">
                  <template v-if="tableTxtName">{{ tableTxtName }}</template>
                  <template v-else>
                    <span class="text-neutral-500">（先輸入主機名）</span>
                  </template>
                </td>
                <td class="px-3 py-2.5 break-all font-mono text-[0.7rem]">
                  <template v-if="tableTxtValuePreview">{{ tableTxtValuePreview }}</template>
                  <template v-else>
                    <span class="text-neutral-500">新增網域後取得</span>
                  </template>
                </td>
                <td class="px-3 py-2.5 whitespace-nowrap">
                  <button
                    type="button"
                    class="mr-2 text-sky-800 underline hover:text-sky-950 disabled:opacity-50"
                    :disabled="!tableTxtName"
                    @click="copyTableTxtName"
                  >
                    主機
                  </button>
                  <button
                    type="button"
                    class="text-sky-800 underline hover:text-sky-950 disabled:opacity-50"
                    :disabled="!tableTxtValuePreview"
                    @click="copyTableTxtValue"
                  >
                    內容
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-xs text-sky-900/85">
          變更 DNS 後傳播可能需數分鐘至數小時。第 3 筆完成後請按下方「檢查驗證」。若遺失 TXT 驗證碼請移除此網域再新增。
        </p>

        <div class="rounded-md bg-white/70 px-3 py-2 text-xs text-sky-900 ring-1 ring-sky-200/70">
          <strong>提示：</strong>HTTPS（第 2 筆）目標須與 Cloudflare Custom Hostname 一致；平台若已設定環境變數會自動組字串，否則請到 Cloudflare 詳情複製。
        </div>
      </div>
    </details>

    <p v-if="error" class="text-sm text-red-600">
      {{ loadErrMessage }}
    </p>

    <template v-else>
      <p v-if="actionErr" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ actionErr }}
      </p>
      <p v-if="actionOk" class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {{ actionOk }}
      </p>

      <section
        v-if="dnsHint"
        class="rounded-lg border border-amber-200 bg-amber-50/80 p-5 shadow-sm space-y-3"
      >
        <h2 class="text-sm font-semibold text-amber-950">
          步驟 3：本系統商店歸屬驗證（TXT）
        </h2>
        <p class="text-xs text-amber-900/95 leading-relaxed">
          請在 DNS 新增下列 <strong>TXT</strong>。完成後按「檢查驗證」。
          若尚未做<strong> CNAME 流量導向</strong>與<strong> HTTPS（_acme-challenge）</strong>，請先依上方「操作指引」處理，否則網站可能仍無法連線或無憑證。
        </p>
        <p class="text-xs text-amber-900/90">
          在 DNS 管理後台新增一筆 <strong>TXT</strong> 記錄：
        </p>
        <dl class="grid gap-2 text-xs sm:grid-cols-[7rem_1fr] sm:gap-x-3">
          <dt class="font-medium text-amber-900">
            名稱／主機
          </dt>
          <dd class="flex flex-wrap items-center gap-2 break-all font-mono text-amber-950">
            <span>{{ txtRecordName }}</span>
            <button
              type="button"
              class="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 hover:bg-amber-100"
              @click="copyPlainText(txtRecordName, 'TXT 名稱已複製。')"
            >
              複製名稱
            </button>
          </dd>
          <dt class="font-medium text-amber-900">
            值
          </dt>
          <dd class="flex flex-wrap items-center gap-2">
            <code class="break-all rounded bg-white/80 px-2 py-1 text-[0.7rem] text-neutral-900 ring-1 ring-amber-200/80">
              {{ dnsHint.verificationToken }}
            </code>
            <button
              type="button"
              class="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 hover:bg-amber-100"
              @click="copyToken"
            >
              複製驗證碼
            </button>
          </dd>
        </dl>
        <div class="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            :disabled="busyId === dnsHint.id"
            @click="verifyDomain(dnsHint.id)"
          >
            檢查驗證
          </button>
          <button
            type="button"
            class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            @click="dnsHint = null"
          >
            稍後再驗證
          </button>
        </div>
      </section>

      <section class="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <h2 class="text-sm font-semibold text-neutral-900">
          新增網域
        </h2>
        <p class="text-xs text-neutral-600 leading-relaxed">
          請輸入<strong>完整 hostname</strong>（例：<code class="rounded bg-neutral-100 px-1">shop.example.com</code>），勿含
          <code class="rounded bg-neutral-100 px-1">https://</code>。送出後請依黃色區塊完成 TXT，並搭配上方「操作指引」的 CNAME／憑證步驟。
        </p>
        <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="addDomain">
          <div class="min-w-0 flex-1">
            <label class="block text-xs font-medium text-neutral-600">
              網域名稱（例：shop.example.com）
            </label>
            <input
              v-model="newHostname"
              type="text"
              autocomplete="off"
              placeholder="your-store.com"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-400 focus:ring-2"
            >
          </div>
          <button
            type="submit"
            class="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            :disabled="adding"
          >
            {{ adding ? '新增中…' : '新增' }}
          </button>
        </form>
        <p v-if="addErr" class="text-sm text-red-600">
          {{ addErr }}
        </p>
      </section>

      <section class="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div class="border-b border-neutral-200 px-5 py-3">
          <h2 class="text-sm font-semibold text-neutral-900">
            已設定網域
          </h2>
        </div>
        <div v-if="pending" class="px-5 py-8 text-center text-sm text-neutral-500">
          載入中…
        </div>
        <div
          v-else-if="!data?.items?.length"
          class="px-5 py-8 text-center text-sm text-neutral-500"
        >
          尚未新增自訂網域。
        </div>
        <ul v-else class="divide-y divide-neutral-100">
          <li
            v-for="row in data.items"
            :key="row.id"
            class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-mono text-sm font-medium text-neutral-900">
                {{ row.hostname }}
                <span
                  v-if="row.cfLinked"
                  class="ml-2 inline-flex rounded bg-sky-100 px-1.5 py-0.5 align-middle font-sans text-xs font-medium text-sky-900"
                  title="已於 Cloudflare Custom Hostnames 註冊"
                >
                  CF
                </span>
              </p>
              <p class="mt-1 text-xs text-neutral-500">
                新增於 {{ formatTime(row.createdAt) }}
                <span v-if="row.verifiedAt">
                  · 已驗證 {{ formatTime(row.verifiedAt) }}
                </span>
              </p>
              <p v-if="!row.verifiedAt" class="mt-2 space-y-1 text-xs text-neutral-600">
                <span class="font-medium text-amber-700">等待 DNS（本系統 TXT）驗證</span>
                <span class="block font-medium text-amber-800">本系統 TXT 名稱：</span>
                <span class="flex flex-wrap items-center gap-2 font-mono text-neutral-800">
                  {{ txtHostFor(row.hostname) }}
                  <button
                    type="button"
                    class="text-sky-700 underline hover:text-sky-900"
                    @click="copyPlainText(txtHostFor(row.hostname), 'TXT 主機名已複製。')"
                  >
                    複製
                  </button>
                </span>
                <span class="block text-neutral-500">
                  驗證碼僅在「新增」成功當下顯示於黃色區塊；若遺失請移除此網域後重新新增。
                </span>
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <button
                v-if="!row.verifiedAt"
                type="button"
                class="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                :disabled="busyId !== null"
                @click="verifyDomain(row.id)"
              >
                檢查驗證
              </button>
              <span
                v-else
                class="inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"
              >
                已驗證
              </span>
              <button
                type="button"
                class="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                :disabled="busyId !== null"
                @click="removeDomain(row.id)"
              >
                移除
              </button>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
