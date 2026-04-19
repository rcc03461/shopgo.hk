<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type SettingsResponse = {
  shopSlug: string
  settings: Record<string, unknown>
  previews: {
    logo: { id: string; publicUrl: string | null; filename: string } | null
    favicon: { id: string; publicUrl: string | null; filename: string } | null
  }
}

const requestFetch = useRequestFetch()
const { uploadImageFile } = useAdminAttachments()

const { data, refresh, error } = await useAsyncData(
  'admin-tenant-settings',
  async () => {
    return await requestFetch<SettingsResponse>('/api/admin/tenant-settings', {
      credentials: 'include',
    })
  },
)

const form = reactive({
  displayName: '',
  tagline: '',
  description: '',
  about: '',
  address: '',
  phone: '',
  contactEmail: '',
  businessHours: '',
  mapUrl: '',
  footerCopyright: '',
  logoAttachmentId: null as string | null,
  faviconAttachmentId: null as string | null,
  socialInstagram: '',
  socialFacebook: '',
  socialYoutube: '',
  socialTiktok: '',
  socialX: '',
  socialLine: '',
  socialWhatsapp: '',
  socialThreads: '',
  socialWebsite: '',
})

/** 與 PATCH body 的 settings 欄位對齊（見 server/utils/tenantSettingsSchemas） */
type TenantSettingsPayload = Record<string, string | null | undefined>

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function attachmentId(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

/** 上傳後尚未儲存前，仍以本機預覽顯示（避免 refresh 洗掉未寫入的 attachment id） */
const localLogoUrl = ref<string | null>(null)
const localFaviconUrl = ref<string | null>(null)

watch(
  () => data.value,
  (v) => {
    if (!v) return
    const s = v.settings ?? {}
    form.displayName = str(s.displayName)
    form.tagline = str(s.tagline)
    form.description = str(s.description)
    form.about = str(s.about)
    form.address = str(s.address)
    form.phone = str(s.phone)
    form.contactEmail = str(s.contactEmail)
    form.businessHours = str(s.businessHours)
    form.mapUrl = str(s.mapUrl)
    form.footerCopyright = str(s.footerCopyright)
    form.logoAttachmentId = attachmentId(s.logoAttachmentId)
    form.faviconAttachmentId = attachmentId(s.faviconAttachmentId)
    form.socialInstagram = str(s.socialInstagram)
    form.socialFacebook = str(s.socialFacebook)
    form.socialYoutube = str(s.socialYoutube)
    form.socialTiktok = str(s.socialTiktok)
    form.socialX = str(s.socialX)
    form.socialLine = str(s.socialLine)
    form.socialWhatsapp = str(s.socialWhatsapp)
    form.socialThreads = str(s.socialThreads)
    form.socialWebsite = str(s.socialWebsite)

    localLogoUrl.value = v.previews.logo?.publicUrl ?? null
    localFaviconUrl.value = v.previews.favicon?.publicUrl ?? null
  },
  { immediate: true },
)

const logoUploading = ref(false)
const faviconUploading = ref(false)
const logoErr = ref<string | null>(null)
const faviconErr = ref<string | null>(null)

async function onLogoFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  logoUploading.value = true
  logoErr.value = null
  try {
    const item = await uploadImageFile(file)
    form.logoAttachmentId = item.id
    localLogoUrl.value = item.publicUrl
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    logoErr.value = x?.data?.message || x?.message || '上傳失敗'
  } finally {
    logoUploading.value = false
  }
}

async function onFaviconFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  faviconUploading.value = true
  faviconErr.value = null
  try {
    const item = await uploadImageFile(file)
    form.faviconAttachmentId = item.id
    localFaviconUrl.value = item.publicUrl
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    faviconErr.value = x?.data?.message || x?.message || '上傳失敗'
  } finally {
    faviconUploading.value = false
  }
}

function clearLogo() {
  form.logoAttachmentId = null
  localLogoUrl.value = null
}

function clearFavicon() {
  form.faviconAttachmentId = null
  localFaviconUrl.value = null
}

function optionalTrim(s: string): string | undefined {
  const t = s.trim()
  return t === '' ? undefined : t
}

function buildSettings(): TenantSettingsPayload {
  return {
    displayName: optionalTrim(form.displayName),
    tagline: optionalTrim(form.tagline),
    description: optionalTrim(form.description),
    about: optionalTrim(form.about),
    address: optionalTrim(form.address),
    phone: optionalTrim(form.phone),
    contactEmail: optionalTrim(form.contactEmail),
    businessHours: optionalTrim(form.businessHours),
    mapUrl: optionalTrim(form.mapUrl),
    footerCopyright: optionalTrim(form.footerCopyright),
    logoAttachmentId: form.logoAttachmentId,
    faviconAttachmentId: form.faviconAttachmentId,
    socialInstagram: optionalTrim(form.socialInstagram),
    socialFacebook: optionalTrim(form.socialFacebook),
    socialYoutube: optionalTrim(form.socialYoutube),
    socialTiktok: optionalTrim(form.socialTiktok),
    socialX: optionalTrim(form.socialX),
    socialLine: optionalTrim(form.socialLine),
    socialWhatsapp: optionalTrim(form.socialWhatsapp),
    socialThreads: optionalTrim(form.socialThreads),
    socialWebsite: optionalTrim(form.socialWebsite),
  }
}

const saving = ref(false)
const saveErr = ref<string | null>(null)

async function save() {
  saving.value = true
  saveErr.value = null
  try {
    await $fetch('/api/admin/tenant-settings', {
      method: 'PATCH',
      credentials: 'include',
      body: { settings: buildSettings() },
    })
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
  <div class="max-w-2xl">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">商店設定</h1>
        <p class="mt-2 text-sm text-neutral-600">
          店名、Logo、聯絡方式與社群連結會儲存在租戶設定中，供日後前台顯示使用。
        </p>
        <p
          v-if="data"
          class="mt-2 text-xs text-neutral-500"
        >
          子網域代號：
          <span class="font-mono text-neutral-700">{{ data.shopSlug }}</span>
          （網址代號如需修改請另洽平台流程）
        </p>
      </div>
      <NuxtLink
        to="/admin/settings/payment"
        class="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
      >
        收款設定
      </NuxtLink>
    </div>

    <p
      v-if="error"
      class="mt-4 text-sm text-red-600"
    >
      無法載入設定。
    </p>

    <form
      v-else
      class="mt-8 space-y-10"
      @submit.prevent="save"
    >
      <p
        v-if="saveErr"
        class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {{ saveErr }}
      </p>

      <!-- 品牌 -->
      <section class="space-y-4">
        <h2 class="text-sm font-semibold text-neutral-900">
          品牌與文案
        </h2>
        <AdminFormTextInput
          v-model="form.displayName"
          label="顯示店名"
          hint="與子網域代號可分開；用於網站標題與頁尾顯示。"
        />
        <AdminFormTextInput
          v-model="form.tagline"
          label="標語（選填）"
        />
        <AdminFormTextarea
          v-model="form.description"
          label="簡短介紹"
          :rows="3"
          hint="一至兩段即可，可用於首頁或 meta 描述。"
        />
        <AdminFormTextarea
          v-model="form.about"
          label="關於我們（選填）"
          :rows="5"
        />
      </section>

      <!-- Logo / Favicon -->
      <section class="space-y-4">
        <h2 class="text-sm font-semibold text-neutral-900">
          視覺識別
        </h2>

        <div class="rounded-lg border border-neutral-200 bg-neutral-50/80 p-4">
          <p class="text-xs font-medium text-neutral-700">
            商店 Logo
          </p>
          <p
            v-if="logoErr"
            class="mt-2 text-xs text-red-600"
          >
            {{ logoErr }}
          </p>
          <div class="mt-3 flex flex-wrap items-end gap-4">
            <div
              class="flex h-24 w-40 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white"
            >
              <img
                v-if="localLogoUrl"
                :src="localLogoUrl"
                alt="Logo 預覽"
                class="max-h-full max-w-full object-contain"
              >
              <span
                v-else
                class="text-xs text-neutral-400"
              >尚無圖片</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <label
                class="cursor-pointer rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              >
                {{ logoUploading ? '上傳中…' : '上傳圖片' }}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="hidden"
                  :disabled="logoUploading"
                  @change="onLogoFile"
                >
              </label>
              <button
                type="button"
                class="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
                @click="clearLogo"
              >
                移除
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-neutral-200 bg-neutral-50/80 p-4">
          <p class="text-xs font-medium text-neutral-700">
            網站小圖示（Favicon）
          </p>
          <p
            v-if="faviconErr"
            class="mt-2 text-xs text-red-600"
          >
            {{ faviconErr }}
          </p>
          <div class="mt-3 flex flex-wrap items-end gap-4">
            <div
              class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white"
            >
              <img
                v-if="localFaviconUrl"
                :src="localFaviconUrl"
                alt="Favicon 預覽"
                class="max-h-full max-w-full object-contain"
              >
              <span
                v-else
                class="text-xs text-neutral-400"
              >尚無</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <label
                class="cursor-pointer rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
              >
                {{ faviconUploading ? '上傳中…' : '上傳圖片' }}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="hidden"
                  :disabled="faviconUploading"
                  @change="onFaviconFile"
                >
              </label>
              <button
                type="button"
                class="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
                @click="clearFavicon"
              >
                移除
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 聯絡 -->
      <section class="space-y-4">
        <h2 class="text-sm font-semibold text-neutral-900">
          聯絡與地址
        </h2>
        <AdminFormTextInput
          v-model="form.phone"
          label="電話"
        />
        <AdminFormTextInput
          v-model="form.contactEmail"
          label="客服電郵"
          type="email"
          autocomplete="email"
        />
        <AdminFormTextarea
          v-model="form.address"
          label="地址"
          :rows="3"
        />
        <AdminFormTextarea
          v-model="form.businessHours"
          label="營業時間（選填）"
          :rows="2"
        />
        <AdminFormTextInput
          v-model="form.mapUrl"
          label="地圖連結（選填）"
          hint="Google Maps 或其他地圖的 https 連結"
        />
      </section>

      <!-- 社群 -->
      <section class="space-y-4">
        <h2 class="text-sm font-semibold text-neutral-900">
          社群與網站
        </h2>
        <p class="text-xs text-neutral-500">
          請填完整 https 網址；留空則前台不顯示該項。
        </p>
        <AdminFormTextInput
          v-model="form.socialWebsite"
          label="官方網站"
        />
        <AdminFormTextInput
          v-model="form.socialInstagram"
          label="Instagram"
        />
        <AdminFormTextInput
          v-model="form.socialFacebook"
          label="Facebook"
        />
        <AdminFormTextInput
          v-model="form.socialYoutube"
          label="YouTube"
        />
        <AdminFormTextInput
          v-model="form.socialTiktok"
          label="TikTok"
        />
        <AdminFormTextInput
          v-model="form.socialX"
          label="X（Twitter）"
        />
        <AdminFormTextInput
          v-model="form.socialThreads"
          label="Threads"
        />
        <AdminFormTextInput
          v-model="form.socialLine"
          label="LINE"
        />
        <AdminFormTextInput
          v-model="form.socialWhatsapp"
          label="WhatsApp"
          hint="建議使用 https://wa.me/852xxxxxxxx 形式"
        />
      </section>

      <!-- 頁尾 -->
      <section class="space-y-4">
        <h2 class="text-sm font-semibold text-neutral-900">
          頁尾
        </h2>
        <AdminFormTextInput
          v-model="form.footerCopyright"
          label="版權／聲明文字（選填）"
          hint="例：© 2026 店名 版權所有"
        />
      </section>

      <div class="flex items-center gap-3 border-t border-neutral-200 pt-6">
        <button
          type="submit"
          class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="saving"
        >
          {{ saving ? '儲存中…' : '儲存設定' }}
        </button>
        <span
          v-if="!saving && data"
          class="text-xs text-neutral-500"
        >變更後請記得儲存</span>
      </div>
    </form>
  </div>
</template>
