<template>
  <button class="theme-switch" @click="toggle" :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`">
    <component :is="theme === 'dark' ? Sun : Moon" :size="16" />
  </button>
</template>
<script setup lang="ts">
import { Sun, Moon } from '@lucide/vue'
const { theme, toggle } = useTheme()
</script>
<style scoped>
.theme-switch { background: var(--elevated); border: 1px solid var(--border); color: var(--text); width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; }
.theme-switch:hover { border-color: var(--accent); }
</style>
