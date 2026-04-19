<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold tracking-tight">總覽</h1>
    <p class="mt-2 text-sm text-neutral-600">
      歡迎使用 <span class="font-mono">{{ tenantSlug }}</span> 的管理後台（第一版為占位）。
    </p>
    <div class="mt-8 grid gap-4 sm:grid-cols-3">
      <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-neutral-500">訂單</p>
        <p class="mt-2 text-2xl font-semibold text-neutral-400">—</p>
      </div>
      <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-neutral-500">商品</p>
        <p class="mt-2 text-2xl font-semibold text-neutral-400">—</p>
      </div>
      <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <p class="text-xs text-neutral-500">訪客</p>
        <p class="mt-2 text-2xl font-semibold text-neutral-400">—</p>
      </div>
    </div>
  </div>
</template>
