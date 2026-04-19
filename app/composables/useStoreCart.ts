import { computed, onMounted, watch } from 'vue'

export type StoreCartLine = {
  productId: string
  productSlug: string
  variantId: string | null
  title: string
  unitPrice: string
  qty: number
  optionSummary?: string
}

/**
 * 租戶購物車：`useState` 供多元件共用，並以 localStorage（鍵含子網域 slug）持久化。
 */
export function useStoreCart() {
  const tenantSlug = useState<string | null>('oshop-tenant-slug')
  const lines = useState<StoreCartLine[]>('oshop-store-cart-lines', () => [])

  function storageKey() {
    const s = tenantSlug.value
    return s ? `oshop-cart-v1:${s}` : null
  }

  function persist() {
    if (!import.meta.client) return
    const k = storageKey()
    if (!k) return
    localStorage.setItem(k, JSON.stringify(lines.value))
  }

  function load() {
    if (!import.meta.client) return
    const k = storageKey()
    if (!k) {
      lines.value = []
      return
    }
    try {
      const raw = localStorage.getItem(k)
      const parsed = raw ? (JSON.parse(raw) as StoreCartLine[]) : []
      lines.value = Array.isArray(parsed) ? parsed : []
    } catch {
      lines.value = []
    }
  }

  watch(tenantSlug, () => load(), { immediate: true })
  watch(lines, persist, { deep: true })
  onMounted(() => load())

  function addLine(entry: Omit<StoreCartLine, 'qty'> & { qty?: number }) {
    const qty = entry.qty ?? 1
    const key = `${entry.productId}:${entry.variantId ?? ''}`
    const idx = lines.value.findIndex(
      (l) => `${l.productId}:${l.variantId ?? ''}` === key,
    )
    if (idx >= 0) {
      const cur = lines.value[idx]!
      lines.value.splice(idx, 1, {
        ...cur,
        qty: Math.min(99, cur.qty + qty),
        unitPrice: entry.unitPrice,
        title: entry.title,
        optionSummary: entry.optionSummary,
      })
    } else {
      lines.value.push({
        productId: entry.productId,
        productSlug: entry.productSlug,
        variantId: entry.variantId,
        title: entry.title,
        unitPrice: entry.unitPrice,
        qty,
        optionSummary: entry.optionSummary,
      })
    }
  }

  function setQty(productId: string, variantId: string | null, qty: number) {
    const q = Math.max(1, Math.min(99, Math.floor(qty)))
    const idx = lines.value.findIndex(
      (l) => `${l.productId}:${l.variantId ?? ''}` === `${productId}:${variantId ?? ''}`,
    )
    if (idx < 0) return
    const cur = lines.value[idx]!
    lines.value.splice(idx, 1, { ...cur, qty: q })
  }

  function removeLine(productId: string, variantId: string | null) {
    const key = `${productId}:${variantId ?? ''}`
    lines.value = lines.value.filter(
      (l) => `${l.productId}:${l.variantId ?? ''}` !== key,
    )
  }

  function clearCart() {
    lines.value = []
    persist()
  }

  const totalQty = computed(() => lines.value.reduce((a, l) => a + l.qty, 0))

  const subtotalMoney = computed(() => {
    const n = lines.value.reduce((a, l) => a + Number(l.unitPrice) * l.qty, 0)
    return Number.isFinite(n) ? n.toFixed(4) : '0.0000'
  })

  return {
    lines,
    load,
    addLine,
    setQty,
    removeLine,
    clearCart,
    totalQty,
    subtotalMoney,
  }
}
