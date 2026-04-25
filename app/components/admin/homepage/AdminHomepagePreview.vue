<script setup lang="ts">
import type { HomepageDynamicModule } from '../../../types/homepage'

defineProps<{
  modules: HomepageDynamicModule[]
}>()
</script>

<template>
  <section class="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
    <p class="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">即時預覽</p>
    <ClientOnly>
      <div class="space-y-3">
        <HomepageModuleRenderer
          v-for="module in modules.filter((item) => item.isEnabled && item.component !== 'nav1')"
          :key="module.uid"
          :module="module"
        />
        <p
          v-if="!modules.some((item) => item.isEnabled && item.component !== 'nav1')"
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
