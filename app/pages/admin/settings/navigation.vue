<script setup lang="ts">
import AdminMenuEditDrawer from '~/components/admin/navigation/AdminMenuEditDrawer.vue'
import AdminMenuTree from '~/components/admin/navigation/AdminMenuTree.vue'
import type { AdminMenuNode } from '~/components/admin/navigation/AdminMenuTreeItem.vue'

definePageMeta({
  layout: 'admin',
})

type MenuResponse = { items: AdminMenuNode[] }
type PagesResponse = {
  items: Array<{
    id: string
    title: string
    slug: string
  }>
}

const route = useRoute()
const requestFetch = useRequestFetch()
const saving = ref(false)
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const drawerOpen = ref(false)
const activeItem = ref<AdminMenuNode | null>(null)
const tree = ref<AdminMenuNode[]>([])

function tabClass(path: string): string {
  const active = route.path === path
  return active
    ? 'rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white'
    : 'rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50'
}

const { data: pagesData } = await useAsyncData(
  'admin-pages-mini-for-menu',
  async () =>
    await requestFetch<PagesResponse>('/api/admin/pages', {
      credentials: 'include',
      query: { page: 1, pageSize: 100 },
    }),
)

async function loadMenus() {
  loading.value = true
  errorMsg.value = null
  try {
    const res = await requestFetch<MenuResponse>('/api/admin/menus', {
      credentials: 'include',
    })
    tree.value = res.items ?? []
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value = err?.data?.message || err?.message || '無法載入菜單'
  } finally {
    loading.value = false
  }
}

await loadMenus()

function flattenTree(
  nodes: AdminMenuNode[],
  parentId: string | null = null,
  depth = 0,
  out: Array<{ id: string; parentId: string | null; sortOrder: number; depth: number }> = [],
) {
  nodes.forEach((node, index) => {
    out.push({
      id: node.id,
      parentId,
      sortOrder: index,
      depth,
    })
    if (node.children?.length) flattenTree(node.children, node.id, depth + 1, out)
  })
  return out
}

async function persistOrder() {
  const items = flattenTree(tree.value)
  if (items.some((item) => item.depth >= 3)) {
    errorMsg.value = '菜單最多只支援 3 層，請調整後再試'
    await loadMenus()
    return
  }
  try {
    await $fetch('/api/admin/menus/reorder', {
      method: 'POST',
      credentials: 'include',
      body: { items },
    })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value = err?.data?.message || err?.message || '儲存排序失敗'
    await loadMenus()
  }
}

async function createMenu(parentId: string | null = null) {
  saving.value = true
  errorMsg.value = null
  try {
    await $fetch('/api/admin/menus', {
      method: 'POST',
      credentials: 'include',
      body: {
        title: '新菜單',
        parentId,
        linkType: 'custom',
        customUrl: '/',
        target: '_self',
        isVisible: true,
      },
    })
    await loadMenus()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value = err?.data?.message || err?.message || '新增菜單失敗'
  } finally {
    saving.value = false
  }
}

async function toggleVisible(item: AdminMenuNode) {
  try {
    await $fetch(`/api/admin/menus/${item.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { isVisible: !item.isVisible },
    })
    item.isVisible = !item.isVisible
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value = err?.data?.message || err?.message || '更新顯示狀態失敗'
  }
}

async function renameItem(item: AdminMenuNode, title: string) {
  try {
    await $fetch(`/api/admin/menus/${item.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { title },
    })
    item.title = title
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value = err?.data?.message || err?.message || '更新名稱失敗'
  }
}

function openDrawer(item: AdminMenuNode) {
  activeItem.value = item
  drawerOpen.value = true
}

async function saveDrawer(payload: {
  title: string
  linkType: 'page' | 'custom'
  pageId: string | null
  customUrl: string | null
  target: '_self' | '_blank'
}) {
  if (!activeItem.value) return
  saving.value = true
  errorMsg.value = null
  try {
    const res = await $fetch<{ item: AdminMenuNode }>(`/api/admin/menus/${activeItem.value.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: payload,
    })
    activeItem.value.title = res.item.title
    activeItem.value.linkType = res.item.linkType
    activeItem.value.pageId = res.item.pageId
    activeItem.value.customUrl = res.item.customUrl
    activeItem.value.target = res.item.target
    activeItem.value.pageSlug =
      payload.linkType === 'page'
        ? (pagesData.value?.items.find((p) => p.id === payload.pageId)?.slug ?? null)
        : null
    drawerOpen.value = false
    activeItem.value = null
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value = err?.data?.message || err?.message || '儲存菜單失敗'
  } finally {
    saving.value = false
  }
}

async function removeItem(item: AdminMenuNode) {
  if (!confirm(`確定刪除「${item.title}」？`)) return
  try {
    await $fetch(`/api/admin/menus/${item.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    await loadMenus()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value = err?.data?.message || err?.message || '刪除菜單失敗'
  }
}
</script>

<template>
  <div class="max-w-5xl space-y-4">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">菜單管理</h1>
      <p class="mt-1 text-sm text-neutral-600">
        支援拖拽排序、跨層級調整、顯示切換、抽屜編輯與雙擊改名。
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3">
      <NuxtLink to="/admin/settings" :class="tabClass('/admin/settings')">商店設定</NuxtLink>
      <NuxtLink to="/admin/settings/payment" :class="tabClass('/admin/settings/payment')">收款設定</NuxtLink>
      <NuxtLink to="/admin/settings/shipping" :class="tabClass('/admin/settings/shipping')">運送設定</NuxtLink>
      <NuxtLink to="/admin/settings/navigation" :class="tabClass('/admin/settings/navigation')">菜單</NuxtLink>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        :disabled="saving || loading"
        @click="createMenu(null)"
      >
        新增根菜單
      </button>
      <button
        type="button"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        :disabled="loading"
        @click="loadMenus"
      >
        重新載入
      </button>
    </div>

    <p v-if="errorMsg" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ errorMsg }}
    </p>

    <div class="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
      <p v-if="loading" class="px-2 py-4 text-sm text-neutral-500">載入中…</p>
      <p v-else-if="!tree.length" class="px-2 py-4 text-sm text-neutral-500">
        尚無菜單，請先新增根菜單。
      </p>
      <AdminMenuTree
        v-else
        v-model:items="tree"
        :busy="saving || loading"
        @changed="persistOrder"
        @toggle-visible="toggleVisible"
        @edit="openDrawer"
        @remove="removeItem"
        @rename="renameItem"
        @add-child="(item) => createMenu(item.id)"
      />
    </div>

    <AdminMenuEditDrawer
      :open="drawerOpen"
      :item="activeItem"
      :pages="pagesData?.items ?? []"
      :saving="saving"
      @close="drawerOpen = false; activeItem = null"
      @save="saveDrawer"
    />
  </div>
</template>

