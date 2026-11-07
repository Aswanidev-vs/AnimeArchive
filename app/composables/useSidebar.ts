import { ref } from 'vue'

export function useSidebar() {
  const collapsed = ref(false)
  const init = () => {
    if (import.meta.client) {
      collapsed.value = localStorage.getItem('aa-sidebar-collapsed') === '1'
    }
  }
  const toggle = () => {
    collapsed.value = !collapsed.value
    if (import.meta.client) localStorage.setItem('aa-sidebar-collapsed', collapsed.value ? '1' : '0')
  }
  return { collapsed, init, toggle }
}
