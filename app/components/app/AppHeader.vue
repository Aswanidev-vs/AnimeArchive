<template>
  <header class="appheader">
    <div class="appheader__left">
      <div class="appheader__title">{{ title }}</div>
    </div>
    <div class="appheader__search" tabindex="0" @click="openSearch" @keydown.enter="openSearch">
      <Search :size="14" />
      <span>Search archive…</span>
      <kbd>Ctrl K</kbd>
    </div>
    <div class="appheader__right">
      <ThemeSwitcher />
      <NuxtLink to="/upload" class="btn btn--primary btn--pill">Upload</NuxtLink>
      <div class="avatar">H</div>
      <div class="avatar">M</div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Search } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const title = computed(() => {
  const map: Record<string, string> = { '/': 'Home', '/gallery': 'Gallery', '/anime': 'Anime Library', '/collections': 'Collections', '/favourites': 'Favourites', '/recent': 'Recently Added', '/upload': 'Upload', '/settings': 'Settings' }
  return map[route.path] ?? 'AnimeArchive'
})
const openSearch = () => {
  // trigger SearchCommand via custom event
  window.dispatchEvent(new CustomEvent('aa:open-search'))
}
</script>

<style scoped>
.appheader { display: none; align-items: center; gap: 16px; padding: 12px 24px; border-bottom: 1px solid var(--border); background: var(--bg); position: sticky; top: 0; z-index: 20; }
@media (min-width: 768px) { .appheader { display: flex; } }
.appheader__title { font-family: 'Newsreader', serif; font-size: 20px; font-weight: 600; }
.appheader__search { flex: 1; max-width: 420px; display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border); padding: 8px 14px; border-radius: var(--radius-pill); cursor: pointer; color: var(--text-muted); font-size: 13px; transition: border-color 0.15s, box-shadow 0.15s; }
.appheader__search:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent); outline: none; }
.appheader__search kbd { margin-left: auto; font-size: 10px; border: 1px solid var(--border); padding: 2px 6px; border-radius: 3px; }
.appheader__right { display: flex; align-items: center; gap: 10px; }
.btn { padding: 8px 14px; border-radius: 4px; font-size: 12px; cursor: pointer; border: 1px solid var(--border); background: var(--surface-elevated); color: var(--text); }
.btn--primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.btn--pill { border-radius: var(--radius-pill); }
.avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); display: grid; place-items: center; font-size: 11px; color: var(--text-secondary); }
</style>
