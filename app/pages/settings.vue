<template>
  <div class="settings">
    <h1 class="page-title">Settings</h1>
    <section class="settings__card">
      <h3>Profile</h3>
      <div class="row"><span>Name</span><span>Haruki</span></div>
      <div class="row"><span>Role</span><span>Owner</span></div>
      <div class="row"><span>Collaborator</span><span>Miyu</span></div>
    </section>
    <section class="settings__card">
      <h3>Appearance</h3>
      <div class="row"><span>Theme</span><ThemeSwitcher /></div>
    </section>
    <section class="settings__card">
      <h3>Storage</h3>
      <div v-if="storage">
        <div class="row"><span>Provider</span><span>{{ storage.provider }}</span></div>
        <div class="row"><span>Status</span><span>{{ storage.connected ? 'Connected' : 'Disconnected' }}</span></div>
        <div class="row"><span>Used</span><span>{{ (storage.usedBytes / 1024 / 1024 / 1024).toFixed(2) }} GB / {{ (storage.totalBytes / 1024 / 1024 / 1024).toFixed(0) }} GB</span></div>
        <div v-for="v in storage.volumes" :key="v.name" class="vol">
          <div class="vol__name">{{ v.name }}</div>
          <div class="vol__bar"><div class="vol__fill" :style="{ width: (v.usedBytes / v.totalBytes * 100) + '%' }" /></div>
          <div class="vol__meta">{{ (v.usedBytes/1024/1024/1024).toFixed(2) }} / {{ (v.totalBytes/1024/1024/1024).toFixed(0) }} GB</div>
        </div>
      </div>
    </section>
    <section class="settings__card">
      <h3>Data management</h3>
      <p class="muted">Export and deletion tools will be available with the backend integration.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '~/services/api/client'
import type { StorageInfo } from '~/services/api/types'
const storage = ref<StorageInfo | null>(null)
onMounted(async () => { storage.value = await api.getStorageInfo() })
</script>

<style scoped>
.settings { display: flex; flex-direction: column; gap: 20px; max-width: 720px; }
.page-title { font-family: 'Newsreader', serif; font-size: 32px; margin: 0 0 8px; }
.settings__card { background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.settings__card h3 { font-family: 'Newsreader', serif; font-size: 18px; margin: 0; }
.row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--border); }
.row:last-child { border-bottom: none; }
.row span:first-child { color: var(--text-secondary); }
.vol { margin-top: 10px; }
.vol__name { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.vol__bar { height: 6px; background: var(--bg); border-radius: 3px; overflow: hidden; }
.vol__fill { height: 100%; background: var(--accent); }
.vol__meta { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.muted { font-size: 13px; color: var(--text-muted); }
</style>
