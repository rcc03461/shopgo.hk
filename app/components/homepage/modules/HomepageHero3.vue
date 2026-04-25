<script setup lang="ts">
import type { HomepageBannerModuleConfig } from '../../../types/homepage'

defineProps<HomepageBannerModuleConfig>()
</script>

<template>
  <section class="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <LandingHeroSection :hero="hero" />
  </section>
</template>
