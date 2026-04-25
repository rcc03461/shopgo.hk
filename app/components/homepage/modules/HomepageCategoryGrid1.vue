<script setup lang="ts">
import type { HomepageCategoryModuleConfig } from '../../../types/homepage'

defineProps<HomepageCategoryModuleConfig>()
</script>

<template>
  <section class="mx-auto max-w-5xl border-t border-neutral-200 px-4 py-10 sm:px-6">
    <div class="mb-4">
      <h2 class="text-xl font-semibold tracking-tight text-neutral-900">
        {{ title }}
      </h2>
    </div>
    <div class="flex flex-wrap gap-2">
      <NuxtLink
        v-for="category in categories"
        :key="category.id"
        :to="{ path: '/products', query: { categoryId: category.id } }"
        class="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-700"
      >
        {{ category.label }}
      </NuxtLink>
    </div>
  </section>
</template>
