<script setup lang="ts">
import draggable from 'vuedraggable'
import AdminMenuTreeItem from './AdminMenuTreeItem.vue'
import type { AdminMenuNode } from './AdminMenuTreeItem.vue'
import type { Ref } from 'vue'

const props = withDefaults(
  defineProps<{
    depth?: number
    maxDepth?: number
    busy?: boolean
    parentId?: string | null
  }>(),
  {
    depth: 0,
    maxDepth: 3,
    busy: false,
    parentId: null,
  },
)

const items = defineModel<AdminMenuNode[]>('items', { required: true })

const emit = defineEmits<{
  changed: []
  toggleVisible: [item: AdminMenuNode]
  edit: [item: AdminMenuNode]
  remove: [item: AdminMenuNode]
  rename: [item: AdminMenuNode, title: string]
  addChild: [item: AdminMenuNode]
}>()
const canAddChild = computed(() => props.depth < props.maxDepth - 1)
const isEmptyList = computed(() => items.value.length === 0)

type DragVisualState = {
  draggingId: Ref<string | null>
  dropParentId: Ref<string | null>
  draggingTitle: Ref<string | null>
}

const inheritedState = inject<DragVisualState | null>('admin-menu-dnd-state', null)
const draggingId = inheritedState?.draggingId ?? ref<string | null>(null)
const dropParentId = inheritedState?.dropParentId ?? ref<string | null>(null)
const draggingTitle = inheritedState?.draggingTitle ?? ref<string | null>(null)
const isDragActive = computed(() => Boolean(draggingId.value))

if (!inheritedState) {
  provide<DragVisualState>('admin-menu-dnd-state', {
    draggingId,
    dropParentId,
    draggingTitle,
  })
}

function onDragStart(evt: { item: HTMLElement }) {
  draggingId.value = evt.item?.dataset.menuId || null
  draggingTitle.value = evt.item?.dataset.menuTitle || null
}

function onDragEnd() {
  draggingId.value = null
  dropParentId.value = null
  draggingTitle.value = null
}

function onMove(evt: { to?: HTMLElement }) {
  if (!draggingId.value) return true
  const targetParentId = evt.to?.dataset?.parentId || null
  dropParentId.value = targetParentId === draggingId.value ? null : targetParentId
  return true
}
</script>

<template>
  <draggable
    v-model="items"
    item-key="id"
    handle=".cursor-grab"
    :group="{ name: 'admin-menu-tree', pull: true, put: true }"
    class="space-y-2"
    :class="{
      'min-h-14 rounded border border-dashed border-neutral-300 bg-neutral-50/70 px-2 py-2': isEmptyList,
    }"
    ghost-class="opacity-40"
    chosen-class="ring-2"
    drag-class="menu-tree-dragging"
    :data-parent-id="parentId ?? ''"
    @start="onDragStart"
    @end="onDragEnd"
    @move="onMove"
    @change="emit('changed')"
  >
    <template #item="{ element }">
      <div
        :data-menu-id="element.id"
        :data-menu-title="element.title"
        class="transition-transform duration-150"
      >
        <AdminMenuTreeItem
          :item="element"
          :depth="depth"
          :busy="busy"
          :can-add-child="canAddChild"
          :is-drop-target="dropParentId === element.id"
          :is-dragging="draggingId === element.id"
          :is-drag-active="isDragActive"
          @toggle-visible="(item) => emit('toggleVisible', item)"
          @edit="(item) => emit('edit', item)"
          @remove="(item) => emit('remove', item)"
          @rename="(item, title) => emit('rename', item, title)"
          @add-child="(item) => emit('addChild', item)"
        />

        <div
          v-if="canAddChild || element.children?.length"
          class="ml-8 mt-2 rounded border-l border-neutral-200 pl-3 transition-all duration-150"
          :class="{
            'border-blue-500 bg-blue-50/80 shadow-inner ring-2 ring-blue-200': dropParentId === element.id,
            'border-dashed border-neutral-300 bg-neutral-50/60': isDragActive && dropParentId !== element.id,
          }"
        >
          <div
            v-if="dropParentId === element.id"
            class="mb-2 flex items-center gap-2 rounded-lg border border-blue-400 bg-gradient-to-r from-blue-100 to-sky-50 px-3 py-2 text-sm font-semibold text-blue-800 shadow-sm"
          >
            <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">
              ↓
            </span>
            <span class="truncate">
              放開滑鼠：將「{{ draggingTitle || '此項目' }}」移到「{{ element.title }}」底下
            </span>
          </div>

          <AdminMenuTree
            v-model:items="element.children"
            :depth="depth + 1"
            :max-depth="maxDepth"
            :busy="busy"
            :parent-id="element.id"
            @changed="emit('changed')"
            @toggle-visible="(item) => emit('toggleVisible', item)"
            @edit="(item) => emit('edit', item)"
            @remove="(item) => emit('remove', item)"
            @rename="(item, title) => emit('rename', item, title)"
            @add-child="(item) => emit('addChild', item)"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div
        v-if="isEmptyList"
        class="rounded-lg border border-dashed px-3 py-2 text-sm transition-all duration-150"
        :class="
          dropParentId === parentId
            ? 'animate-pulse border-blue-500 bg-blue-100 text-blue-700 shadow-sm'
            : isDragActive
              ? 'border-neutral-300 bg-neutral-50 text-neutral-500'
              : 'border-transparent text-neutral-400'
        "
      >
        {{ dropParentId === parentId ? '放開即可移到此父項下' : '拖到這裡可成為子菜單' }}
      </div>
    </template>
  </draggable>
</template>

<style scoped>
.menu-tree-dragging {
  opacity: 0.8;
  transform: scale(0.99);
}
</style>

