<script setup lang="ts">
import type { HomepageFooterModuleConfig } from '../../../types/homepage'

defineProps<HomepageFooterModuleConfig>()
</script>

<template>
  <section
    class="mx-auto max-w-5xl border-t border-neutral-200 px-4 py-10 text-xs text-neutral-500 sm:px-6"
  >
    {{ text }}
  </section>
</template>
