<script setup lang="ts">
import { formatHkd } from '~/utils/formatHkd'

definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const { lines, setQty, removeLine, subtotalMoney, totalQty } = useStoreCart()
const hasInvalidLines = computed(() => lines.value.some((l) => l.isValid === false))
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <div v-if="!tenantSlug" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
      <p class="font-medium">目前網址不是商店子網域</p>
      <p class="mt-2 text-amber-800/90">
        請以商店子網域開啟購物車。
      </p>
    </div>

    <template v-else>
      <div class="flex items-end justify-between gap-4">
        <h1 class="text-2xl font-semibold tracking-tight text-neutral-900">
          購物車
        </h1>
        <NuxtLink
          to="/products"
          class="text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          繼續購物
        </NuxtLink>
      </div>

      <p v-if="lines.length === 0" class="mt-10 text-sm text-neutral-600">
        購物車是空的。
        <NuxtLink to="/products" class="font-medium text-neutral-900 underline">
          前往商品列表
        </NuxtLink>
      </p>

      <ul v-else class="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
        <li
          v-for="line in lines"
          :key="`${line.productId}:${line.variantId ?? ''}`"
          class="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <NuxtLink
              :to="`/products/${line.productSlug}`"
              class="text-sm font-semibold text-neutral-900 hover:underline"
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
          <div class="flex flex-wrap items-center gap-3">
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

      <div
        v-if="lines.length > 0"
        class="mt-8 flex flex-col gap-4 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="text-sm text-neutral-600">
          共 <span class="font-semibold text-neutral-900">{{ totalQty }}</span> 件商品
        </div>
        <div class="text-right">
          <p class="text-xs uppercase tracking-wide text-neutral-500">
            小計
          </p>
          <p class="text-xl font-semibold text-neutral-900">
            {{ formatHkd(subtotalMoney) }}
          </p>
        </div>
      </div>

      <div v-if="lines.length > 0" class="mt-8">
        <p
          v-if="hasInvalidLines"
          class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          購物車內有失效項目，請先調整或移除後再前往付款。
        </p>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          :disabled="hasInvalidLines"
          @click="navigateTo('/payment')"
        >
          前往付款
        </button>
      </div>
    </template>
  </div>
</template>
