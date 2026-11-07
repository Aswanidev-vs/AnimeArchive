<template>
  <nav class="mnav">
    <NuxtLink v-for="item in nav" :key="item.to" :to="item.to" class="mnav__item" :class="{ 'is-active': route.path === item.to }">
      <component :is="item.icon" :size="20" />
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { Home, Images, Library, FolderKanban, Upload } from '@lucide/vue'
const route = useRoute()
const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/gallery', label: 'Gallery', icon: Images },
  { to: '/anime', label: 'Anime', icon: Library },
  { to: '/collections', label: 'Collections', icon: FolderKanban },
  { to: '/upload', label: 'Upload', icon: Upload },
]
</script>
<style scoped>
.mnav { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-around; padding: 8px 4px 12px; background: var(--surface); border-top: 1px solid var(--border); z-index: 30; }
.mnav__item { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 10px; color: var(--text-muted); padding: 4px 8px; border-radius: 4px; }
.mnav__item.is-active { color: var(--accent); }
@media (min-width: 768px) { .mnav { display: none; } }
</style>
