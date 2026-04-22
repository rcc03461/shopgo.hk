<script setup lang="ts">
import AdminInlineEditName from './AdminInlineEditName.vue'

export type AdminMenuNode = {
  id: string
  title: string
  parentId: string | null
  sortOrder: number
  isVisible: boolean
  linkType: 'page' | 'custom'
  pageId: string | null
  customUrl: string | null
  target: '_self' | '_blank'
  pageSlug?: string | null
  children: AdminMenuNode[]
}

const props = defineProps<{
  item: AdminMenuNode
  depth: number
  busy?: boolean
  canAddChild?: boolean
  isDropTarget?: boolean
  isDragging?: boolean
  isDragActive?: boolean
}>()

const emit = defineEmits<{
  toggleVisible: [item: AdminMenuNode]
  edit: [item: AdminMenuNode]
  remove: [item: AdminMenuNode]
  rename: [item: AdminMenuNode, title: string]
  addChild: [item: AdminMenuNode]
}>()

const linkPreview = computed(() => {
  if (props.item.linkType === 'custom') {
    return props.item.customUrl?.trim() || '未設定連結'
  }
  if (props.item.pageSlug) {
    return `/p/${props.item.pageSlug}`
  }
  return '未連結頁面'
})
</script>

<template>
  <div
    class="rounded-lg border bg-white px-3 py-2 transition-all duration-150"
    :class="{
      'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200 scale-[1.01]': isDropTarget,
      'border-neutral-300': !isDropTarget,
      'opacity-85': isDragging,
      'border-dashed border-neutral-300/80': isDragActive && !isDropTarget,
    }"
  >
    <div class="flex items-center gap-2">
      <span class="cursor-grab select-none text-neutral-400">⋮⋮</span>
      <AdminInlineEditName
        :value="item.title"
        :disabled="busy"
        @save="(title) => emit('rename', item, title)"
      />
      <span class="max-w-[20rem] truncate text-xs text-neutral-400">
        {{ linkPreview }}
      </span>
      <span class="shrink-0 text-[11px] text-neutral-500">
        {{ item.linkType === 'page' ? '頁面' : '自訂' }}
      </span>
      <span
        v-if="isDropTarget"
        class="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
      >
        將成為子項
      </span>
      <div class="ml-auto flex items-center gap-1">
        <button
          type="button"
          class="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          :title="item.isVisible ? '隱藏' : '顯示'"
          :disabled="busy"
          @click="emit('toggleVisible', item)"
        >
          {{ item.isVisible ? '👁' : '🙈' }}
        </button>
        <button
          v-if="canAddChild"
          type="button"
          class="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          :disabled="busy"
          @click="emit('addChild', item)"
        >
          子項
        </button>
        <button
          type="button"
          class="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          :disabled="busy"
          @click="emit('edit', item)"
        >
          編輯
        </button>
        <button
          type="button"
          class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          :disabled="busy"
          @click="emit('remove', item)"
        >
          刪除
        </button>
      </div>
    </div>
  </div>
</template>

