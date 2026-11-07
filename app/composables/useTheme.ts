import { ref, watch } from 'vue'

export function useTheme() {
  const theme = ref<'dark' | 'light'>('dark')

  const apply = () => {
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', theme.value)
      localStorage.setItem('aa-theme', theme.value)
    }
  }

  const init = () => {
    if (import.meta.client) {
      const saved = localStorage.getItem('aa-theme') as 'dark' | 'light' | null
      if (saved) theme.value = saved
      apply()
    }
  }

  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    apply()
  }

  watch(theme, apply)
  return { theme, init, toggle, apply }
}
