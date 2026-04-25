<script setup lang="ts">
import { formatHkd } from '~/utils/formatHkd'

const route = useRoute()
const { isOpen, closeCartDrawer } = useCartDrawer()
const { lines, setQty, removeLine, subtotalMoney, totalQty } = useStoreCart()
const hasInvalidLines = computed(() => lines.value.some((l) => l.isValid === false))
let originalOverflow = ''

watch(isOpen, (open) => {
  if (!import.meta.client) return
  if (open) {
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = originalOverflow
})

watch(
  () => route.fullPath,
  () => {
    closeCartDrawer()
  },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    closeCartDrawer()
  }
}

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = originalOverflow
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50"
      aria-label="購物車抽屜"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-black/35"
        aria-label="關閉購物車"
        @click="closeCartDrawer"
      />
      <aside
        class="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <header class="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2 class="text-base font-semibold text-neutral-900">
            購物車
          </h2>
          <button
            type="button"
            class="rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50"
            @click="closeCartDrawer"
          >
            關閉
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p v-if="lines.length === 0" class="text-sm text-neutral-600">
            購物車是空的。
          </p>

          <ul v-else class="divide-y divide-neutral-200 border-y border-neutral-200">
            <li
              v-for="line in lines"
              :key="`${line.productId}:${line.variantId ?? ''}`"
              class="py-4"
            >
              <div class="min-w-0">
                <NuxtLink
                  :to="`/products/${line.productSlug}`"
                  class="text-sm font-semibold text-neutral-900 hover:underline"
                  @click="closeCartDrawer"
                >
                  {{ line.title }}
                </NuxtLink>
                <p v-if="line.optionSummary" class="mt-1 text-xs text-neutral-500">
                  {{ line.optionSummary }}
                </p>
                <p class="mt-1 font-mono text-xs text-neutral-500">
                  {{ formatHkd(line.unitPrice) }} × {{ line.qty }}
                </p>
                <p
                  v-if="line.isValid === false && line.validationMessage"
                  class="mt-2 text-xs text-red-600"
                >
                  {{ line.validationMessage }}
                </p>
              </div>
              <div class="mt-3 flex items-center justify-between gap-3">
                <label class="flex items-center gap-2 text-sm text-neutral-600">
                  數量
                  <input
                    type="number"
                    min="1"
                    max="99"
                    :value="line.qty"
                    class="w-16 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                    @change="
                      setQty(
                        line.productId,
                        line.variantId,
                        Number(($event.target as HTMLInputElement).value) || 1,
                      )
                    "
                  >
                </label>
                <button
                  type="button"
                  class="text-sm font-medium text-red-600 hover:text-red-700"
                  @click="removeLine(line.productId, line.variantId)"
                >
                  移除
                </button>
              </div>
            </li>
          </ul>
        </div>

        <footer class="border-t border-neutral-200 px-4 py-4">
          <div class="mb-4 flex items-end justify-between gap-3">
            <div class="text-sm text-neutral-600">
              共 <span class="font-semibold text-neutral-900">{{ totalQty }}</span> 件商品
            </div>
            <div class="text-right">
              <p class="text-xs uppercase tracking-wide text-neutral-500">
                小計
              </p>
              <p class="text-lg font-semibold text-neutral-900">
                {{ formatHkd(subtotalMoney) }}
              </p>
            </div>
          </div>

          <p
            v-if="hasInvalidLines"
            class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            購物車內有失效項目，請先調整或移除後再前往付款。
          </p>

          <div class="grid grid-cols-2 gap-2">
            <NuxtLink
              to="/cart"
              class="inline-flex items-center justify-center rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
              @click="closeCartDrawer"
            >
              完整購物車
            </NuxtLink>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="lines.length === 0 || hasInvalidLines"
              @click="
                closeCartDrawer();
                navigateTo('/payment')
              "
            >
              前往付款
            </button>
          </div>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
