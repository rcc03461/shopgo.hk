<script setup lang="ts">
import type { HomepageDynamicModule } from '../../../types/homepage'

const props = defineProps<{
  modules: HomepageDynamicModule[]
}>()

const enabledModules = computed(() => props.modules.filter((item) => item.isEnabled))
const hasEnabledNav = computed(() => enabledModules.value.some((item) => item.component === 'nav1'))
const contentModules = computed(() => enabledModules.value.filter((item) => item.component !== 'nav1'))
</script>

<template>
  <section class="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
    <p class="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">即時預覽</p>
    <ClientOnly>
      <div class="space-y-3">
        <section
          v-if="hasEnabledNav"
          class="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700"
        >
          <p class="font-medium">導覽列（nav1）</p>
          <p class="mt-1 text-neutral-500">此模組會渲染在頁面頂部 Header，內容區不重覆渲染。</p>
        </section>
        <HomepageModuleRenderer
          v-for="module in contentModules"
          :key="module.uid"
          :module="module"
        />
        <p
          v-if="!hasEnabledNav && !contentModules.length"
          class="rounded border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500"
        >
          尚未啟用可預覽模組。
        </p>
      </div>
      <template #fallback>
        <div class="h-40 rounded-md border border-neutral-200 bg-neutral-50" />
      </template>
    </ClientOnly>
  </section>
</template>
