<template>
  <div class="viewer" @keydown="onKey" tabindex="0" ref="root">
    <button class="viewer__close" @click="emit('close')" aria-label="Close"><X :size="18" /></button>
    <button class="viewer__nav viewer__nav--prev" @click="prev" :disabled="index <= 0"><ChevronLeft :size="20" /></button>
    <div class="viewer__stage">
      <img :src="current.originalUrl" :alt="current.title" class="viewer__img" :style="{ transform: `scale(${zoom})` }" />
    </div>
    <button class="viewer__nav viewer__nav--next" @click="next" :disabled="index >= items.length - 1"><ChevronRight :size="20" /></button>

    <div class="viewer__toolbar">
      <button class="tool-btn" @click="zoomOut"><Minus :size="16" /></button>
      <span class="tool-zoom">{{ Math.round(zoom * 100) }}%</span>
      <button class="tool-btn" @click="zoomIn"><Plus :size="16" /></button>
      <span class="tool-sep" />
      <button class="tool-btn" :class="{ 'is-on': current.favourite }" @click="toggleFav"><Heart :size="16" :fill="current.favourite ? 'currentColor' : 'none'" /></button>
      <button class="tool-btn" @click="toggleFullscreen"><Maximize :size="16" /></button>
      <span class="tool-sep" />
      <span class="tool-counter">{{ index + 1 }} / {{ items.length }}</span>
    </div>

    <aside class="viewer__panel">
      <div class="panel__chip-row">
        <span class="chip chip--accent"><span class="chip__dot" />{{ seriesName(current.animeId) }}</span>
        <span class="chip chip--neutral">{{ episodeLabel(current) }}</span>
      </div>
      <h2 class="panel__title">{{ current.title || 'Untitled' }}</h2>
      <div v-if="current.characters.length" class="panel__chips">
        <span v-for="ch in current.characters" :key="ch" class="chip chip--neutral">{{ ch }}</span>
      </div>
      <div class="panel__tags">
        <span v-for="t in current.tags" :key="t" class="tag">{{ t }}</span>
      </div>
      <blockquote v-if="current.notes" class="panel__notes">{{ current.notes }}</blockquote>
      <div class="panel__meta">
        <div class="meta-row"><Calendar :size="14" /><span>Added {{ timeAgo(current.uploadedAt) }}</span></div>
        <div class="meta-row"><Users :size="14" /><span>By {{ current.uploadedBy === 'u1' ? 'You & Cousin' : 'Cousin' }}</span></div>
        <div class="meta-row"><ImageIcon :size="14" /><span>{{ current.width }} × {{ current.height }}</span></div>
      </div>

      <div class="panel__collection">
        <button class="combo-trigger" @click="comboOpen = !comboOpen">
          {{ chosenCollection ? collectionName(chosenCollection) : 'Add to collection…' }} <ChevronDown :size="14" />
        </button>
        <div v-if="comboOpen" class="combo-menu">
          <input v-model="comboQuery" class="combo-search" placeholder="Search collections…" />
          <button v-for="c in filteredCollections" :key="c.id" class="combo-item" :class="{ 'is-active': chosenCollection === c.id }" @click="pickCollection(c.id)">
            <Check v-if="chosenCollection === c.id" :size="14" /> {{ c.name }}
          </button>
        </div>
        <button class="btn-pill" @click="addToCollection" :disabled="!chosenCollection">Add</button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { X, ChevronLeft, ChevronRight, Minus, Plus, Heart, Maximize, Calendar, Users, ImageIcon, ChevronDown, Check } from '@lucide/vue'
import type { Screenshot, Collection } from '~/services/api/types'
import { api } from '~/services/api/client'

const props = defineProps<{ items: Screenshot[]; startId: string }>()
const emit = defineEmits<{ close: [] }>()

const index = ref(props.items.findIndex((s) => s.id === props.startId))
if (index.value < 0) index.value = 0
const zoom = ref(1)
const root = ref<HTMLElement | null>(null)

const current = computed(() => props.items[index.value] as Screenshot)

const collections = ref<Collection[]>([])
const chosenCollection = ref('')
const comboOpen = ref(false)
const comboQuery = ref('')
const filteredCollections = computed(() => {
  const q = comboQuery.value.toLowerCase()
  return q ? collections.value.filter((c) => c.name.toLowerCase().includes(q)) : collections.value
})

const seriesName = (id: string) => {
  const a = ['Shadows of Edo', 'Neon Kowloon', 'The Last Garden', 'Glass Sky', 'Iron Season', 'Paper Moon']
  const idx = ['a1','a2','a3','a4','a5','a6'].indexOf(id)
  return idx >= 0 ? a[idx] : 'Series'
}
const episodeLabel = (s: Screenshot) => {
  const n = (s.episodeId || '').split('-').pop() || '1'
  return `S1 • E${n.padStart(2, '0')}`
}
const timeAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}
const collectionName = (id: string) => collections.value.find((c) => c.id === id)?.name ?? ''

const close = () => emit('close')
const prev = () => { if (index.value > 0) { index.value--; zoom.value = 1 } }
const next = () => { if (index.value < props.items.length - 1) { index.value++; zoom.value = 1 } }
const zoomIn = () => { zoom.value = Math.min(3, zoom.value + 0.25) }
const zoomOut = () => { zoom.value = Math.max(0.5, zoom.value - 0.25) }
const toggleFav = async () => { await api.toggleFavourite(current.value.id); current.value.favourite = !current.value.favourite }
const toggleFullscreen = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  else document.exitFullscreen?.()
}
const pickCollection = (id: string) => { chosenCollection.value = id; comboOpen.value = false }
const addToCollection = async () => {
  if (!chosenCollection.value) return
  await api.addToCollection(chosenCollection.value, current.value.id)
  chosenCollection.value = ''
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
  if (e.key === 'f' || e.key === 'F') toggleFav()
  if (e.key === '+' || e.key === '=') zoomIn()
  if (e.key === '-') zoomOut()
}

onMounted(async () => {
  root.value?.focus()
  collections.value = await api.listCollections()
})
</script>

<style scoped>
.viewer { position: fixed; inset: 0; background: var(--bg); z-index: 50; display: grid; grid-template-columns: 1fr 360px; }
.viewer__close { position: absolute; top: 16px; right: 16px; z-index: 6; width: 44px; height: 44px; border-radius: 50%; background: var(--elevated); border: 1px solid var(--border); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.viewer__nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 6; width: 44px; height: 44px; border-radius: 50%; background: var(--elevated); border: 1px solid var(--border); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.viewer__nav--prev { left: 16px; }
.viewer__nav--next { right: 376px; }
.viewer__nav:disabled { opacity: 0.3; cursor: not-allowed; }
.viewer__stage { display: grid; place-items: center; padding: 40px; overflow: hidden; background: radial-gradient(ellipse at center, var(--surface) 0%, var(--bg) 70%); }
.viewer__img { max-width: 100%; max-height: 82vh; object-fit: contain; transition: transform 0.2s; }
.viewer__toolbar { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 6px; background: var(--elevated); border: 1px solid var(--border); padding: 6px 10px; border-radius: var(--radius-pill); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.tool-btn { width: 36px; height: 36px; border-radius: 50%; background: transparent; border: none; color: var(--text-2); display: grid; place-items: center; cursor: pointer; }
.tool-btn:hover { color: var(--text); }
.tool-btn.is-on { color: var(--accent); }
.tool-zoom { font-size: 12px; color: var(--text-2); min-width: 44px; text-align: center; font-variant-numeric: tabular-nums; }
.tool-sep { width: 1px; height: 18px; background: var(--border); margin: 0 4px; }
.tool-counter { font-size: 12px; color: var(--text-muted); padding-left: 6px; }
.viewer__panel { background: var(--surface); border-left: 1px solid var(--border); padding: 28px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.panel__chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: var(--radius-pill); font-size: 12px; font-family: 'Inter', sans-serif; }
.chip--accent { background: var(--accent); color: #f1efe8; }
.chip__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.7; }
.chip--neutral { background: var(--elevated); color: var(--text-2); border: 1px solid var(--border); }
.panel__title { font-family: 'Newsreader', serif; font-size: 26px; font-weight: 500; margin: 0; letter-spacing: -0.01em; line-height: 1.15; }
.panel__chips { display: flex; gap: 6px; flex-wrap: wrap; }
.panel__tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { padding: 3px 10px; border-radius: var(--radius-pill); background: var(--elevated); color: var(--text-2); font-size: 11px; border: 1px solid var(--border); }
.panel__notes { font-family: 'Newsreader', serif; font-size: 14px; color: var(--text-2); margin: 0; padding-left: 12px; border-left: 2px solid var(--accent); font-style: italic; }
.panel__meta { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
.meta-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-2); }
.panel__collection { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
.combo-trigger { display: inline-flex; align-items: center; justify-content: space-between; gap: 6px; padding: 10px 14px; border-radius: var(--radius-pill); background: var(--elevated); border: 1px solid var(--border); color: var(--text); font-size: 13px; cursor: pointer; width: 100%; }
.combo-menu { background: var(--elevated); border: 1px solid var(--border); border-radius: 16px; padding: 6px; display: flex; flex-direction: column; gap: 2px; }
.combo-search { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 10px; font-size: 12px; margin-bottom: 4px; }
.combo-item { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 10px; background: transparent; border: none; color: var(--text-2); font-size: 13px; cursor: pointer; text-align: left; }
.combo-item:hover { background: var(--surface); color: var(--text); }
.combo-item.is-active { color: var(--accent); }
.btn-pill { padding: 10px 16px; border-radius: var(--radius-pill); background: var(--accent); color: #f1efe8; border: none; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-pill:disabled { opacity: 0.4; cursor: not-allowed; }
@media (max-width: 767px) {
  .viewer { grid-template-columns: 1fr; }
  .viewer__panel { position: fixed; bottom: 0; left: 0; right: 0; max-height: 45vh; border-left: none; border-top: 1px solid var(--border); }
  .viewer__nav--next { right: 16px; }
}
</style>
