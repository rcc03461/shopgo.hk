<script setup lang="ts">
type CatalogOptionValue = { value: string; sortOrder: number }
type CatalogOption = {
  name: string
  sortOrder: number
  values: CatalogOptionValue[]
}
type CatalogVariant = {
  skuCode: string
  price: string
  stockQuantity: number
  imageUrl: string
  valueIndexes: number[]
}

const props = defineProps<{
  productId: string
}>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { default: false })

const catalog = defineModel<{ options: CatalogOption[]; variants: CatalogVariant[] }>(
  'catalog',
  {
    required: true,
  },
)

const dialogRef = ref<HTMLDialogElement | null>(null)
const saving = ref(false)
const errorMsg = ref<string | null>(null)

watch(open, (v) => {
  nextTick(() => {
    if (v) {
      errorMsg.value = null
      dialogRef.value?.showModal()
    } else {
      dialogRef.value?.close()
    }
  })
})

function onDialogClose() {
  open.value = false
}

function addOption() {
  catalog.value.options.push({
    name: '',
    sortOrder: catalog.value.options.length,
    values: [{ value: '', sortOrder: 0 }],
  })
  for (const v of catalog.value.variants) {
    v.valueIndexes.push(0)
  }
}

function removeOption(index: number) {
  catalog.value.options.splice(index, 1)
  for (const v of catalog.value.variants) {
    v.valueIndexes.splice(index, 1)
  }
}

function addValue(optionIndex: number) {
  const opt = catalog.value.options[optionIndex]
  if (!opt) return
  opt.values.push({ value: '', sortOrder: opt.values.length })
}

function removeValue(optionIndex: number, valueIndex: number) {
  const opt = catalog.value.options[optionIndex]
  if (!opt || opt.values.length <= 1) return
  opt.values.splice(valueIndex, 1)
  for (const v of catalog.value.variants) {
    const cur = v.valueIndexes[optionIndex] ?? 0
    if (cur === valueIndex) v.valueIndexes[optionIndex] = 0
    else if (cur > valueIndex) v.valueIndexes[optionIndex] = cur - 1
  }
}

function addVariant() {
  const n = catalog.value.options.length
  catalog.value.variants.push({
    skuCode: '',
    price: '0',
    stockQuantity: 0,
    imageUrl: '',
    valueIndexes: Array.from({ length: n }, () => 0),
  })
}

function removeVariant(index: number) {
  catalog.value.variants.splice(index, 1)
}

async function saveCatalog() {
  saving.value = true
  errorMsg.value = null
  try {
    await $fetch(`/api/admin/products/${props.productId}/catalog`, {
      method: 'PUT',
      body: {
        options: catalog.value.options.map((o, oi) => ({
          name: o.name,
          sortOrder: o.sortOrder ?? oi,
          values: o.values.map((val, vi) => ({
            value: val.value,
            sortOrder: val.sortOrder ?? vi,
          })),
        })),
        variants: catalog.value.variants.map((v) => ({
          skuCode: v.skuCode,
          price: v.price,
          stockQuantity: v.stockQuantity,
          imageUrl: v.imageUrl?.trim() ? v.imageUrl.trim() : null,
          valueIndexes: [...v.valueIndexes],
        })),
      },
      credentials: 'include',
    })
    open.value = false
    emit('saved')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value =
      err?.data?.message || err?.message || '儲存失敗，請稍後再試'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="w-full max-w-3xl rounded-lg border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
    @close="onDialogClose"
  >
    <div class="flex max-h-[85vh] flex-col">
      <div
        class="flex items-center justify-between border-b border-neutral-200 px-4 py-3"
      >
        <h2 class="text-base font-semibold text-neutral-900">規格與 SKU</h2>
        <button
          type="button"
          class="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
          @click="dialogRef?.close()"
        >
          關閉
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p v-if="errorMsg" class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ errorMsg }}
        </p>

        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-neutral-800">規格類型與選項值</h3>
            <button
              type="button"
              class="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
              @click="addOption"
            >
              新增規格
            </button>
          </div>

          <div
            v-if="catalog.options.length === 0"
            class="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-600"
          >
            尚未設定規格。若商品無多規格，可直接於下方新增 SKU（不選規格組合）。
          </div>

          <div
            v-for="(opt, oi) in catalog.options"
            :key="oi"
            class="rounded-md border border-neutral-200 bg-white p-3"
          >
            <div class="flex flex-wrap items-end gap-2">
              <label class="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs text-neutral-600">
                名稱
                <input
                  v-model="opt.name"
                  type="text"
                  class="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                  placeholder="例如：顏色"
                />
              </label>
              <label class="flex w-24 flex-col gap-1 text-xs text-neutral-600">
                排序
                <input
                  v-model.number="opt.sortOrder"
                  type="number"
                  class="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                />
              </label>
              <button
                type="button"
                class="rounded-md border border-red-200 px-2 py-1.5 text-xs text-red-700 hover:bg-red-50"
                @click="removeOption(oi)"
              >
                刪除規格
              </button>
            </div>
            <div class="mt-2 space-y-2">
              <div
                v-for="(val, vi) in opt.values"
                :key="vi"
                class="flex flex-wrap items-end gap-2"
              >
                <label class="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-neutral-600">
                  選項值
                  <input
                    v-model="val.value"
                    type="text"
                    class="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                    placeholder="例如：紅"
                  />
                </label>
                <label class="flex w-24 flex-col gap-1 text-xs text-neutral-600">
                  排序
                  <input
                    v-model.number="val.sortOrder"
                    type="number"
                    class="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <button
                  type="button"
                  class="rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                  @click="addValue(oi)"
                >
                  新增值
                </button>
                <button
                  type="button"
                  class="rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                  :disabled="opt.values.length <= 1"
                  @click="removeValue(oi, vi)"
                >
                  刪除值
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-6 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-neutral-800">SKU 列表</h3>
            <button
              type="button"
              class="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
              @click="addVariant"
            >
              新增 SKU
            </button>
          </div>

          <div
            v-if="catalog.variants.length === 0"
            class="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-600"
          >
            尚未建立 SKU。請新增至少一筆以販售（可無規格）。
          </div>

          <div class="overflow-x-auto rounded-md border border-neutral-200">
            <table class="min-w-full divide-y divide-neutral-200 text-sm">
              <thead class="bg-neutral-50 text-left text-xs font-medium text-neutral-600">
                <tr>
                  <th class="px-2 py-2">SKU</th>
                  <th class="px-2 py-2">價格</th>
                  <th class="px-2 py-2">庫存</th>
                  <th class="px-2 py-2">圖片 URL</th>
                  <th
                    v-for="(opt, oi) in catalog.options"
                    :key="oi"
                    class="px-2 py-2"
                  >
                    {{ opt.name || `規格 ${oi + 1}` }}
                  </th>
                  <th class="px-2 py-2" />
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200 bg-white">
                <tr v-for="(row, ri) in catalog.variants" :key="ri">
                  <td class="px-2 py-1.5">
                    <input
                      v-model="row.skuCode"
                      type="text"
                      class="w-28 rounded border border-neutral-300 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td class="px-2 py-1.5">
                    <input
                      v-model="row.price"
                      type="text"
                      class="w-24 rounded border border-neutral-300 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td class="px-2 py-1.5">
                    <input
                      v-model.number="row.stockQuantity"
                      type="number"
                      min="0"
                      class="w-20 rounded border border-neutral-300 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td class="px-2 py-1.5">
                    <input
                      v-model="row.imageUrl"
                      type="text"
                      class="w-40 max-w-[10rem] rounded border border-neutral-300 px-1.5 py-1 text-xs"
                      placeholder="可空"
                    />
                  </td>
                  <td
                    v-for="(opt, oi) in catalog.options"
                    :key="oi"
                    class="px-2 py-1.5"
                  >
                    <select
                      v-model.number="row.valueIndexes[oi]"
                      class="max-w-[8rem] rounded border border-neutral-300 px-1 py-1 text-xs"
                    >
                      <option
                        v-for="(val, vi) in opt.values"
                        :key="vi"
                        :value="vi"
                      >
                        {{ val.value || `值 ${vi + 1}` }}
                      </option>
                    </select>
                  </td>
                  <td class="px-2 py-1.5">
                    <button
                      type="button"
                      class="text-xs text-red-600 hover:underline"
                      @click="removeVariant(ri)"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div
        class="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3"
      >
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100"
          @click="dialogRef?.close()"
        >
          取消
        </button>
        <button
          type="button"
          class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="saving"
          @click="saveCatalog"
        >
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </div>
    </div>
  </dialog>
</template>
