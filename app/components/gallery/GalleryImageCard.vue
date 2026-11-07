<template>
  <article class="card" :class="{ 'is-selected': selected, 'is-grid': mode === 'grid', 'is-compact': mode === 'compact' }">
    <div class="card__fig" @click="emit('open', item.id)">
      <img :src="item.thumbUrl" :alt="item.title" loading="lazy" class="card__img" />
      <div class="card__vignette" />
      <div class="card__float">
        <button class="float-btn" :class="{ 'is-on': item.favourite }" @click.stop="emit('toggle-favourite', item.id)" aria-label="Favourite">
          <Heart :size="16" :fill="item.favourite ? 'currentColor' : 'none'" />
        </button>
        <button class="float-btn" @click.stop="emit('open', item.id)" aria-label="More">
          <MoreHorizontal :size="16" />
        </button>
      </div>
      <label class="card__select" @click.stop>
        <input type="checkbox" :checked="selected" @change="emit('toggle-select', item.id)" />
      </label>
      <div v-if="mode === 'compact'" class="card__compact-title">{{ item.title || 'Untitled' }}</div>
    </div>

    <div v-if="mode !== 'compact'" class="card__body" :class="{ 'is-collapsed': mode === 'grid' }">
      <div class="card__chips">
        <span class="chip chip--accent"><span class="chip__dot" />{{ seriesName(item.animeId) }}</span>
        <span class="chip chip--neutral">{{ episodeLabel(item) }}</span>
      </div>
      <h3 class="card__title">{{ item.title || 'Untitled' }}</h3>
      <p class="card__sub">{{ item.notes || item.description || item.sceneTitle || '' }}</p>
      <div class="card__tags">
        <span v-for="t in item.tags.slice(0, 4)" :key="t" class="tag">{{ t }}</span>
        <span v-if="item.tags.length > 4" class="tag">+{{ item.tags.length - 4 }}</span>
      </div>
      <div class="card__divider" />
      <div class="card__meta">
        <span class="meta-item"><Calendar :size="13" /> Added {{ timeAgo(item.uploadedAt) }}</span>
        <span class="meta-sep" />
        <span class="meta-item"><Users :size="13" /> By {{ item.uploadedBy === 'u1' ? 'You & Cousin' : 'Cousin' }}</span>
        <span class="meta-spacer" />
        <span class="meta-item meta-item--right"><ImageIcon :size="13" /> {{ item.width }} × {{ item.height }}</span>
      </div>
      <div class="card__divider" />
      <div class="card__actions">
        <button class="icon-btn" aria-label="Bookmark"><Bookmark :size="16" /></button>
        <button class="icon-btn" aria-label="Share"><Share2 :size="16" /></button>
        <button class="icon-btn" aria-label="Download"><Download :size="16" /></button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { Heart, MoreHorizontal, Calendar, Users, ImageIcon, Bookmark, Share2, Download } from '@lucide/vue'
import type { Screenshot } from '~/services/api/types'
import { api } from '~/services/api/client'

const props = defineProps<{ item: Screenshot; selected: boolean; mode?: 'masonry' | 'grid' | 'compact' }>()
const emit = defineEmits<{ open: [id: string]; 'toggle-select': [id: string]; 'toggle-favourite': [id: string] }>()

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
</script>

<style scoped>
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-card); overflow: hidden; transition: transform 0.18s ease, box-shadow 0.18s ease; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
[data-theme='dark'] .card { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02); }
.card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
.card.is-grid .card__sub,
.card.is-grid .card__actions { opacity: 0; max-height: 0; overflow: hidden; transition: opacity 0.18s, max-height 0.18s; }
.card.is-grid:hover .card__sub,
.card.is-grid:hover .card__actions { opacity: 1; max-height: 200px; }
.card.is-selected { outline: 2px solid var(--accent); }
.card__fig { position: relative; aspect-ratio: 16/9; overflow: hidden; background: var(--elevated); }
.card__img { width: 100%; height: 100%; object-fit: cover; transition: filter 0.18s ease; }
.card:hover .card__img { filter: brightness(1.04); }
.card__vignette { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 40%); pointer-events: none; }
.card__float { position: absolute; top: 10px; right: 10px; display: flex; gap: 6px; }
.float-btn { width: 34px; height: 34px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(20,20,18,0.55); backdrop-filter: blur(8px); color: #fff; display: grid; place-items: center; cursor: pointer; transition: background 0.15s; }
.float-btn:hover { background: rgba(20,20,18,0.75); }
.float-btn.is-on { color: var(--accent); }
.card__select { position: absolute; top: 10px; left: 10px; opacity: 0; transition: opacity 0.15s; }
.card:hover .card__select { opacity: 1; }
.card.is-selected .card__select { opacity: 1; }
.card__compact-title { position: absolute; bottom: 10px; left: 12px; right: 12px; color: #fff; font-family: 'Newsreader', serif; font-size: 16px; font-weight: 500; text-shadow: 0 1px 4px rgba(0,0,0,0.6); }
.card__body { padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 10px; }
.card__chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: var(--radius-pill); font-size: 12px; font-family: 'Inter', sans-serif; }
.chip--accent { background: var(--accent); color: #f1efe8; }
.chip__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.7; }
.chip--neutral { background: var(--elevated); color: var(--text-2); border: 1px solid var(--border); }
.card__title { font-family: 'Newsreader', serif; font-size: 24px; font-weight: 500; margin: 0; letter-spacing: -0.01em; line-height: 1.2; }
.card__sub { font-family: 'Newsreader', serif; font-size: 14px; color: var(--text-2); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 400; }
.card__tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { padding: 3px 10px; border-radius: var(--radius-pill); background: var(--elevated); color: var(--text-2); font-size: 11px; border: 1px solid var(--border); }
.card__divider { height: 1px; background: var(--border); margin: 4px 0; }
.card__meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--text-2); }
.meta-item { display: inline-flex; align-items: center; gap: 5px; }
.meta-sep { width: 1px; height: 12px; background: var(--border); }
.meta-spacer { flex: 1; }
.meta-item--right { margin-left: auto; }
.card__actions { display: flex; gap: 8px; align-items: center; }
.btn-primary { flex: 1; padding: 10px 16px; border-radius: var(--radius-pill); background: var(--accent); color: #f1efe8; border: none; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; }
.btn-primary:hover { opacity: 0.92; }
.icon-btn { width: 40px; height: 40px; border-radius: 50%; background: var(--elevated); border: 1px solid var(--border); color: var(--text-2); display: grid; place-items: center; cursor: pointer; transition: color 0.15s, border-color 0.15s; }
.icon-btn:hover { color: var(--text); border-color: var(--accent); }

@media (max-width: 767px) {
  .card__body { padding: 16px; }
  .card__title { font-size: 20px; }
  .card__meta { font-size: 11px; }
}
</style>
