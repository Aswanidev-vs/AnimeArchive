<template>
  <header class="mheader">
    <button class="mheader__burger" @click="open = true" aria-label="Open menu"><Menu :size="20" /></button>
    <img src="/logo.png" alt="AnimeArchive" class="mheader__mark" />
    <div class="mheader__title">AnimeArchive</div>
    <ThemeSwitcher />
  </header>
  <Teleport to="body">
    <div v-if="open" class="drawer-backdrop" @click="open = false">
      <aside class="drawer" @click.stop>
        <AppSidebar />
      </aside>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { Menu } from '@lucide/vue'
const open = ref(false)
</script>
<style scoped>
.mheader { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--bg); position: sticky; top: 0; z-index: 20; }
.mheader__burger { background: transparent; border: none; color: var(--text); cursor: pointer; padding: 4px; }
.mheader__mark { width: 26px; height: 26px; object-fit: contain; border-radius: 2px; }
.mheader__title { font-family: 'Newsreader', serif; font-size: 15px; font-weight: 600; flex: 1; }
@media (min-width: 768px) { .mheader { display: none; } }
.drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
.drawer { position: fixed; top: 0; left: 0; bottom: 0; width: 260px; background: var(--surface); z-index: 41; overflow-y: auto; }
.drawer :deep(.sidebar) { height: 100%; border-right: none; position: static; }
</style>
