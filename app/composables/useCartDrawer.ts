export function useCartDrawer() {
  const isOpen = useState<boolean>('oshop-cart-drawer-open', () => false)

  function openCartDrawer() {
    isOpen.value = true
  }

  function closeCartDrawer() {
    isOpen.value = false
  }

  function toggleCartDrawer() {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen,
    openCartDrawer,
    closeCartDrawer,
    toggleCartDrawer,
  }
}
