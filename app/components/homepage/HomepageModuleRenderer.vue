<script setup lang="ts">
import type { HomepageDynamicModule, HomepageModule } from '../../types/homepage'
import { homepageModuleRegistry } from './registry'
import { toDynamicHomepageModule } from '~/utils/homepageEditor'

const props = defineProps<{
  module: HomepageModule | HomepageDynamicModule
}>()

const dynamicModule = computed<HomepageDynamicModule>(() => {
  if ('component' in props.module && 'props' in props.module) {
    return props.module
  }
  return toDynamicHomepageModule(props.module as HomepageModule)
})

const resolvedComponent = computed(() => homepageModuleRegistry[dynamicModule.value.component])
</script>

<template>
  <component
    :is="resolvedComponent"
    v-if="resolvedComponent"
    v-bind="dynamicModule.props"
  />
  <section
    v-else
    class="mx-auto max-w-5xl rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-700 sm:px-6"
  >
    未支援的首頁模組：{{ dynamicModule.component }}
  </section>
</template>
