<script setup lang="ts">
const { user, refresh, logout } = useAuth()
const { customer, refresh: refreshCustomer, logout: logoutCustomer } = useCustomerAuth()
const tenantSlug = useState<string | null>('oshop-tenant-slug')
const { totalQty } = useStoreCart()
const { openCartDrawer } = useCartDrawer()
const requestFetch = useRequestFetch()

type StoreNavItem = {
  id: string
  title: string
  href: string
  target: '_self' | '_blank'
  children: StoreNavItem[]
}

type StoreHomepageModule = {
  moduleType?: string
  component?: string
  isEnabled: boolean
  config?: Record<string, unknown>
  props?: Record<string, unknown>
}

const { data: storeNav } = await useAsyncData(
  () => `store-navigation-${tenantSlug.value || 'platform'}`,
  async () => {
    if (!tenantSlug.value) return [] as StoreNavItem[]
    try {
      const res = await requestFetch<{ items: StoreNavItem[] }>('/api/store/navigation')
      return res.items ?? []
    } catch {
      return [] as StoreNavItem[]
    }
  },
  { watch: [tenantSlug] },
)

const { data: storeHomepageModules } = await useAsyncData(
  () => `store-homepage-modules-nav-${tenantSlug.value || 'platform'}`,
  async () => {
    if (!tenantSlug.value) return [] as StoreHomepageModule[]
    try {
      const res = await requestFetch<{ items?: StoreHomepageModule[]; dynamicItems?: StoreHomepageModule[] }>(
        '/api/store/homepage/modules',
      )
      return (res.dynamicItems?.length ? res.dynamicItems : res.items) ?? []
    } catch {
      return [] as StoreHomepageModule[]
    }
  },
  { watch: [tenantSlug] },
)

const showTopNav = computed(() => {
  if (!tenantSlug.value) return true
  const navModule = (storeHomepageModules.value ?? []).find(
    (item) => item.moduleType === 'nav' || item.component === 'nav1',
  )
  if (!navModule || !navModule.isEnabled) return false
  const configShow =
    ((navModule.config as { show?: boolean } | undefined)?.show ??
      (navModule.props as { show?: boolean } | undefined)?.show)
  return configShow !== false
})

const { data: tenantInfo } = await useAsyncData(
  () => `store-tenant-info-${tenantSlug.value || 'platform'}`,
  async () => {
    if (!tenantSlug.value) {
      return null as null | {
        shopSlug: string
        displayName: string
        logoUrl: string | null
      }
    }
    try {
      return await requestFetch<{
        shopSlug: string
        displayName: string
        logoUrl: string | null
      }>('/api/store/tenant-info')
    } catch {
      return {
        shopSlug: tenantSlug.value,
        displayName: tenantSlug.value,
        logoUrl: null,
      }
    }
  },
  { watch: [tenantSlug] },
)

const adminEntry = computed(() =>
  user.value ? useTenantAdminEntryUrl(user.value.shopSlug) : '',
)

onMounted(() => {
  void refresh()
  void refreshCustomer()
})

async function handleLogout() {
  await logout()
  await navigateTo('/')
}

async function handleCustomerLogout() {
  await logoutCustomer()
  await navigateTo('/')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white text-neutral-900">
    <header class="border-b border-neutral-200">
      <div
        class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <NuxtLink to="/" class="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <img
            v-if="tenantInfo?.logoUrl"
            :src="tenantInfo.logoUrl"
            :alt="`${tenantInfo.displayName} Logo`"
            class="h-6 w-6 rounded object-cover"
          >
          <span>{{ tenantInfo?.displayName || 'OShop' }}</span>
        </NuxtLink>
        <nav v-if="showTopNav" class="flex flex-wrap items-center gap-3 text-sm">
          <NuxtLink
            v-if="tenantSlug"
            to="/products"
            class="rounded-md px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
          >
            商品
          </NuxtLink>
          <template v-for="item in storeNav ?? []" :key="item.id">
            <a
              :href="item.href"
              :target="item.target"
              :rel="item.target === '_blank' ? 'noopener noreferrer' : undefined"
              class="rounded-md px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {{ item.title }}
            </a>
          </template>
          <button
            v-if="tenantSlug"
            type="button"
            class="relative rounded-md px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
            @click="openCartDrawer"
          >
            購物車
            <span
              v-if="totalQty > 0"
              class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-semibold leading-none text-white"
            >
              {{ totalQty > 99 ? '99+' : totalQty }}
            </span>
          </button>
          <template v-if="user">
            <span class="hidden text-neutral-600 sm:inline">
              {{ user.email }}
            </span>
            <span class="text-neutral-500">·</span>
            <span class="text-neutral-600">{{ user.shopSlug }}</span>
            <NuxtLink
              v-if="tenantSlug && user.shopSlug === tenantSlug"
              to="/admin/dashboard"
              class="rounded-md border border-neutral-200 px-3 py-1.5 font-medium text-neutral-800 hover:bg-neutral-50"
            >
              後台
            </NuxtLink>
            <NuxtLink
              v-else-if="!tenantSlug"
              :to="adminEntry"
              external
              class="rounded-md border border-neutral-200 px-3 py-1.5 font-medium text-neutral-800 hover:bg-neutral-50"
            >
              商店後台
            </NuxtLink>
            <button
              type="button"
              class="rounded-md border border-neutral-300 px-3 py-1.5 font-medium text-neutral-800 hover:bg-neutral-50"
              @click="handleLogout"
            >
              登出
            </button>
          </template>
          <template v-else-if="customer && tenantSlug">
            <span class="hidden text-neutral-600 sm:inline">
              {{ customer.fullName || customer.email }}
            </span>
            <NuxtLink
              to="/profile"
              class="rounded-md border border-neutral-200 px-3 py-1.5 font-medium text-neutral-800 hover:bg-neutral-50"
            >
              會員中心
            </NuxtLink>
            <button
              type="button"
              class="rounded-md border border-neutral-300 px-3 py-1.5 font-medium text-neutral-800 hover:bg-neutral-50"
              @click="handleCustomerLogout"
            >
              登出
            </button>
          </template>
          <template v-else>
            <NuxtLink
              :to="tenantSlug ? '/login' : '/admin/login'"
              class="rounded-md px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
            >
              登入
            </NuxtLink>
            <NuxtLink
              :to="tenantSlug ? '/register' : '/admin/register'"
              class="rounded-md bg-neutral-900 px-3 py-1.5 font-medium text-white hover:bg-neutral-800"
            >
              {{ tenantSlug ? '會員註冊' : '開店註冊' }}
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <StoreCartDrawer />

    <footer class="border-t border-neutral-200">
      <div
        class="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-neutral-500 sm:px-6"
      >
        © {{ new Date().getFullYear() }} OShop · oshop.com.hk
      </div>
    </footer>
  </div>
</template>
