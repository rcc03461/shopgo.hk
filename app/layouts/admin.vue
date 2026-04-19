<script setup lang="ts">
const tenantSlug = useState<string | null>('oshop-tenant-slug')

const nav = [
  { to: '/admin/dashboard', label: '總覽' },
  { to: '/admin/pages', label: '頁面' },
  { to: '/admin/categories', label: '分類' },
  { to: '/admin/products', label: '商品' },
  { to: '/admin/orders', label: '訂單' },
  { to: '/admin/customers', label: '顧客' },
  { to: '/admin/settings', label: '設定' },
]
</script>

<template>
  <div class="flex min-h-screen bg-neutral-50 text-neutral-900">
    <aside
      class="hidden w-52 shrink-0 border-r border-neutral-200 bg-white md:block"
    >
      <div class="border-b border-neutral-200 px-4 py-4">
        <p class="text-xs font-medium uppercase tracking-wide text-neutral-500">
          租戶後台
        </p>
        <p class="mt-1 font-mono text-sm font-semibold text-neutral-900">
          {{ tenantSlug || '—' }}
        </p>
      </div>
      <nav class="flex flex-col gap-0.5 p-2">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="p-2">
        <NuxtLink
          to="/"
          class="block rounded-md px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          ← 返回店舖首頁
        </NuxtLink>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="border-b border-neutral-200 bg-white md:hidden"
      >
        <div class="flex items-center justify-between gap-3 px-4 py-3">
          <span class="font-mono text-sm font-semibold">{{ tenantSlug }}</span>
          <NuxtLink to="/" class="text-xs text-neutral-500">首頁</NuxtLink>
        </div>
        <nav
          class="flex gap-1 overflow-x-auto border-t border-neutral-100 px-2 pb-2 pt-1"
          aria-label="後台選單"
        >
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="shrink-0 rounded-md px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </header>
      <main class="flex-1 p-4 md:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
