<script setup lang="ts">
import type { HomepageImageSliderModuleConfig } from '../../../types/homepage'

const props = defineProps<HomepageImageSliderModuleConfig>()

const slides = computed(() =>
  (props.slides ?? []).filter((item) => item?.imageUrl),
)
const currentIndex = ref(0)

const hasSlides = computed(() => slides.value.length > 0)
const canLoop = computed(() => props.ui?.loop ?? true)

let autoplayTimer: ReturnType<typeof setInterval> | null = null

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

function goTo(index: number) {
  if (!hasSlides.value) return
  if (canLoop.value) {
    currentIndex.value = (index + slides.value.length) % slides.value.length
    return
  }
  currentIndex.value = Math.max(0, Math.min(index, slides.value.length - 1))
}

function goPrev() {
  goTo(currentIndex.value - 1)
}

function goNext() {
  const next = currentIndex.value + 1
  if (!canLoop.value && next >= slides.value.length) {
    stopAutoplay()
    return
  }
  goTo(next)
}

function startAutoplay() {
  stopAutoplay()
  if (!props.ui?.autoplay || slides.value.length <= 1) return
  autoplayTimer = setInterval(goNext, Math.max(1000, props.ui?.intervalMs ?? 4000))
}

watch(
  slides,
  () => {
    if (!slides.value.length) {
      currentIndex.value = 0
      stopAutoplay()
      return
    }
    if (currentIndex.value >= slides.value.length) currentIndex.value = slides.value.length - 1
  },
  { immediate: true },
)

watch(
  () => [props.ui?.autoplay, props.ui?.intervalMs, props.ui?.loop, slides.value.length],
  () => startAutoplay(),
)

onMounted(() => {
  startAutoplay()
})

onBeforeUnmount(() => stopAutoplay())
</script>

<template>
  <section class="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
    <h2 v-if="props.title" class="mb-4 text-xl font-semibold tracking-tight text-neutral-900">
      {{ props.title }}
    </h2>

    <div v-if="hasSlides" class="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div class="relative aspect-[16/6] w-full bg-neutral-100">
        <img
          :src="slides[currentIndex]?.imageUrl"
          :alt="slides[currentIndex]?.alt || props.title || '首頁輪播圖片'"
          class="h-full w-full object-cover"
        >
        <NuxtLink
          v-if="slides[currentIndex]?.linkUrl"
          :to="slides[currentIndex]?.linkUrl"
          class="absolute inset-0"
          :aria-label="slides[currentIndex]?.alt || '前往連結'"
        />
      </div>

      <div class="flex items-center justify-between border-t border-neutral-200 px-3 py-2">
        <button
          type="button"
          class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          @click="goPrev"
        >
          上一張
        </button>
        <div class="flex items-center gap-1.5">
          <button
            v-for="(slide, idx) in slides"
            :key="slide.id || idx"
            type="button"
            class="h-2 w-2 rounded-full transition-colors"
            :class="idx === currentIndex ? 'bg-neutral-900' : 'bg-neutral-300 hover:bg-neutral-400'"
            :aria-label="`切換到第 ${idx + 1} 張`"
            @click="goTo(idx)"
          />
        </div>
        <button
          type="button"
          class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
          @click="goNext"
        >
          下一張
        </button>
      </div>
    </div>
    <p v-else class="rounded border border-dashed border-neutral-300 px-3 py-6 text-sm text-neutral-500">
      尚未設定輪播圖片。
    </p>
  </section>
</template>
