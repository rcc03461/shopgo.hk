<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
</script>

<template>
  <div v-if="tenantSlug" class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
    <p class="text-xs font-medium uppercase tracking-widest text-neutral-500">
      租戶店舖
    </p>
    <h1 class="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">
      <span class="font-mono">{{ tenantSlug }}</span>
    </h1>
    <p class="mt-3 text-sm text-neutral-600">
      店舖首頁（模組化版面將於之後接入）。管理商品與設定請進後台。
    </p>
    <div class="mt-8 flex flex-wrap gap-3">
      <NuxtLink
        to="/products"
        class="inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        瀏覽商品
      </NuxtLink>
      <NuxtLink
        to="/admin/dashboard"
        class="inline-flex rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
      >
        進入後台
      </NuxtLink>
      <NuxtLink
        to="/admin/login"
        class="inline-flex rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
      >
        管理員登入
      </NuxtLink>
    </div>
  </div>

  <div v-else class="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
    <section class="mx-auto max-w-2xl text-center">
      <p class="text-xs font-medium uppercase tracking-widest text-neutral-500">
        多租戶線上商店
      </p>
      <h1
        class="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl"
      >
        幾分鐘開店，專注賣貨
      </h1>
      <p class="mt-4 text-sm leading-relaxed text-neutral-600 sm:text-base">
        OShop 提供極簡店面與標準購物流程。註冊後即可取得專屬子網域，先把品牌站起來，其餘模組之後慢慢加。
      </p>
      <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <NuxtLink
          to="/admin/register"
          class="inline-flex w-full max-w-xs items-center justify-center rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 sm:w-auto"
        >
          立即開店
        </NuxtLink>
        <NuxtLink
          to="/admin/login"
          class="inline-flex w-full max-w-xs items-center justify-center rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 sm:w-auto"
        >
          已有商店？管理員登入
        </NuxtLink>
      </div>
    </section>

    <section
      class="mx-auto mt-20 grid max-w-3xl gap-6 border-t border-neutral-200 pt-16 sm:grid-cols-3"
    >
      <div>
        <h2 class="text-sm font-semibold text-neutral-900">子網域開店</h2>
        <p class="mt-2 text-sm text-neutral-600">
          每間店獨立網址，品牌辨識更清楚。
        </p>
      </div>
      <div>
        <h2 class="text-sm font-semibold text-neutral-900">模組化首頁</h2>
        <p class="mt-2 text-sm text-neutral-600">
          預設導覽、橫幅、分類與商品區塊，之後可擴充。
        </p>
      </div>
      <div>
        <h2 class="text-sm font-semibold text-neutral-900">標準購物流程</h2>
        <p class="mt-2 text-sm text-neutral-600">
          商品、購物車、付款與發票，依同一套架構擴充。
        </p>
      </div>
    </section>
  </div>
</template>
