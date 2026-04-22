<script setup lang="ts">
import type { AdminMenuNode } from './AdminMenuTreeItem.vue'

type PageOption = { id: string; title: string; slug: string }

const props = defineProps<{
  open: boolean
  item: AdminMenuNode | null
  pages: PageOption[]
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [
    payload: {
      title: string
      linkType: 'page' | 'custom'
      pageId: string | null
      customUrl: string | null
      target: '_self' | '_blank'
    },
  ]
}>()

const form = reactive({
  title: '',
  linkType: 'custom' as 'page' | 'custom',
  pageId: null as string | null,
  customUrl: '',
  target: '_self' as '_self' | '_blank',
})
const localError = ref<string | null>(null)

watch(
  () => props.item,
  (item) => {
    if (!item) return
    localError.value = null
    form.title = item.title
    form.linkType = item.linkType
    form.pageId = item.pageId
    form.customUrl = item.customUrl ?? ''
    form.target = item.target
  },
  { immediate: true },
)

watch(
  () => form.linkType,
  (type) => {
    localError.value = null
    if (type === 'page' && !form.pageId && props.pages.length > 0) {
      form.pageId = props.pages[0]!.id
    }
    if (type === 'custom' && !form.customUrl) {
      form.customUrl = '/'
    }
  },
)

function onSave() {
  localError.value = null
  const title = form.title.trim()
  if (!title) {
    localError.value = '請填寫名稱'
    return
  }
  if (form.linkType === 'page' && !form.pageId) {
    localError.value = '請先選擇要連結的頁面'
    return
  }
  if (form.linkType === 'custom' && !form.customUrl.trim()) {
    localError.value = '請填寫自訂連結'
    return
  }

  emit('save', {
    title,
    linkType: form.linkType,
    pageId: form.linkType === 'page' ? form.pageId : null,
    customUrl: form.linkType === 'custom' ? form.customUrl.trim() : null,
    target: form.target,
  })
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex">
    <button
      type="button"
      class="h-full flex-1 bg-black/30"
      aria-label="關閉抽屜"
      @click="emit('close')"
    />
    <aside class="h-full w-full max-w-md border-l border-neutral-200 bg-white p-4 shadow-xl">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-neutral-900">編輯菜單</h2>
        <button
          type="button"
          class="rounded px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
          @click="emit('close')"
        >
          關閉
        </button>
      </div>

      <div class="mt-4 space-y-4">
        <p
          v-if="localError"
          class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ localError }}
        </p>

        <AdminFormTextInput
          v-model="form.title"
          label="名稱"
          required
        />

        <AdminFormField label="連結類型">
          <select
            v-model="form.linkType"
            class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            <option value="page">頁面</option>
            <option value="custom">自訂連結</option>
          </select>
        </AdminFormField>

        <AdminFormField v-if="form.linkType === 'page'" label="連結頁面">
          <select
            v-model="form.pageId"
            class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            <option :value="null">請選擇頁面</option>
            <option v-for="p in pages" :key="p.id" :value="p.id">
              {{ p.title }} ({{ p.slug }})
            </option>
          </select>
        </AdminFormField>

        <AdminFormTextInput
          v-else
          v-model="form.customUrl"
          label="自訂連結"
          placeholder="/contact 或 https://example.com"
          required
        />

        <AdminFormField label="開啟方式">
          <select
            v-model="form.target"
            class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            <option value="_self">同視窗</option>
            <option value="_blank">新分頁</option>
          </select>
        </AdminFormField>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          type="button"
          class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="saving"
          @click="onSave"
        >
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </div>
    </aside>
  </div>
</template>

