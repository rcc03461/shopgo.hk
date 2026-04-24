<script setup lang="ts">
import type { HomepageProductSliderProps } from '~/types/homepage'

const props = defineProps<HomepageProductSliderProps>()

const displayProducts = computed(() => props.products ?? [])
const perView = computed(() => Math.max(1, props.ui?.perView ?? 4))
const currentPage = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(displayProducts.value.length / perView.value)))

const visibleProducts = computed(() => {
  const start = currentPage.value * perView.value
  return displayProducts.value.slice(start, start + perView.value)
})

const canPrev = computed(() => props.ui.loop || currentPage.value > 0)
const canNext = computed(() => props.ui.loop || currentPage.value < totalPages.value - 1)

let autoplayTimer: ReturnType<typeof setInterval> | null = null

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

function goPrev() {
  if (currentPage.value > 0) {
    currentPage.value -= 1
    return
  }
  if (props.ui.loop) currentPage.value = totalPages.value - 1
}

function goNext() {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value += 1
    return
  }
  if (props.ui.loop) {
    currentPage.value = 0
    return
  }
  stopAutoplay()
}

function startAutoplay() {
  stopAutoplay()
  if (!props.ui.autoplay || totalPages.value <= 1) return
  autoplayTimer = setInterval(goNext, Math.max(1000, props.ui.intervalMs))
}

watch(
  [displayProducts, perView],
  () => {
    if (currentPage.value >= totalPages.value) {
      currentPage.value = Math.max(0, totalPages.value - 1)
    }
  },
  { immediate: true },
)

watch(
  () => [props.ui.autoplay, props.ui.intervalMs, props.ui.loop, totalPages.value],
  () => startAutoplay(),
)

onMounted(() => {
  startAutoplay()
})

onBeforeUnmount(() => {
  stopAutoplay()
})
</script>

<template>
  <section class="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-xl font-semibold tracking-tight text-neutral-900">
        {{ props.title }}
      </h2>
      <div class="flex items-center gap-2" v-if="displayProducts.length > perView">
        <button
          type="button"
          class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          :disabled="!canPrev"
          @click="goPrev"
        >
          上一頁
        </button>
        <span class="text-xs text-neutral-500">{{ currentPage + 1 }} / {{ totalPages }}</span>
        <button
          type="button"
          class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          :disabled="!canNext"
          @click="goNext"
        >
          下一頁
        </button>
      </div>
    </div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <HomepageProductCard
        v-for="product in visibleProducts"
        :key="product.id"
        :product="{
          slug: product.slug,
          name: product.name,
          imageUrl: product.imageUrl,
          priceLabel: product.priceLabel,
        }"
      />
      <p v-if="!displayProducts.length" class="text-sm text-neutral-500">尚未設定商品。</p>
    </div>
  </section>
</template>
