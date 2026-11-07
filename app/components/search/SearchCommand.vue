<template>
  <Teleport to="body">
    <div v-if="open" class="search-modal" @click.self="close">
      <div class="search-panel">
        <div class="search-panel__input">
          <Search :size="16" />
          <input v-model="q" ref="input" placeholder="Search anime, scenes, characters, tags..." @keydown.esc="close" />
          <kbd>Esc</kbd>
        </div>
        <div class="search-panel__results">
          <button v-for="r in results" :key="r.type + r.id" class="search-result" @click="go(r)">
            <img v-if="r.thumbUrl" :src="r.thumbUrl" class="search-result__thumb" />
            <div>
              <div class="search-result__title">{{ r.title }}</div>
              <div class="search-result__sub">{{ r.type }} · {{ r.subtitle }}</div>
            </div>
          </button>
          <div v-if="q && !results.length" class="search-empty">No matches.</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Search } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { api } from '~/services/api/client'
import type { SearchResult } from '~/services/api/types'

const open = ref(false)
const q = ref('')
const results = ref<SearchResult[]>([])
const input = ref<HTMLInputElement | null>(null)
const router = useRouter()

const close = () => { open.value = false; q.value = '' }
const go = (r: SearchResult) => {
  if (r.type === 'anime') router.push(`/anime/${r.id}`)
  else if (r.type === 'collection') router.push('/collections')
  else router.push('/gallery')
  close()
}

watch(q, async (v) => {
  if (!v.trim()) { results.value = []; return }
  results.value = await api.search(v)
})

watch(open, (v) => {
  if (v) nextTick(() => input.value?.focus())
})

// global shortcut
if (import.meta.client) {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      open.value = true
    }
    if (e.key === 'Escape' && open.value) close()
  })
  window.addEventListener('aa:open-search', () => { open.value = true })
}

defineExpose({ open })
</script>

<style scoped>
.search-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 60; display: grid; place-items: start center; padding-top: 12vh; }
.search-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; width: 90%; max-width: 560px; overflow: hidden; }
.search-panel__input { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--border); }
.search-panel__input input { flex: 1; background: transparent; border: none; color: var(--text); font-size: 14px; outline: none; }
.search-panel__input kbd { font-size: 10px; color: var(--text-muted); border: 1px solid var(--border); padding: 2px 6px; border-radius: 3px; }
.search-panel__results { max-height: 50vh; overflow-y: auto; }
.search-result { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 10px 14px; background: transparent; border: none; color: var(--text); cursor: pointer; border-bottom: 1px solid var(--border); }
.search-result:hover { background: var(--surface-elevated); }
.search-result__thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 3px; }
.search-result__title { font-size: 13px; font-weight: 500; }
.search-result__sub { font-size: 11px; color: var(--text-muted); text-transform: capitalize; }
.search-empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
</style>
