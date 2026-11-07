<template>
  <div class="filterbar">
    <div class="pill-dropdown" v-click-outside="() => openDd = null">
      <button class="pill-dropdown__trigger" @click="toggle('anime')">
        {{ selectedAnimeLabel }} <ChevronDown :size="14" />
      </button>
      <div v-if="openDd === 'anime'" class="pill-dropdown__menu">
        <button class="pill-dropdown__item" :class="{ 'is-active': !local.animeId }" @click="pickAnime('')">All anime</button>
        <button v-for="a in animeList" :key="a.id" class="pill-dropdown__item" :class="{ 'is-active': local.animeId === a.id }" @click="pickAnime(a.id)">{{ a.title }}</button>
      </div>
    </div>

    <div class="pill-dropdown">
      <button class="pill-dropdown__trigger" @click="toggle('tag')">
        {{ local.tag || 'All tags' }} <ChevronDown :size="14" />
      </button>
      <div v-if="openDd === 'tag'" class="pill-dropdown__menu">
        <button class="pill-dropdown__item" :class="{ 'is-active': !local.tag }" @click="pickTag('')">All tags</button>
        <button v-for="t in tags" :key="t" class="pill-dropdown__item" :class="{ 'is-active': local.tag === t }" @click="pickTag(t)">{{ t }}</button>
      </div>
    </div>

    <button class="toggle-pill" :class="{ 'is-on': local.favourite }" @click="toggleFav">
      <Heart :size="13" :fill="local.favourite ? 'currentColor' : 'none'" /> Favourites
    </button>

    <div class="seg-control">
      <span class="seg-indicator" :style="{ transform: `translateX(${modeIndex * 100}%)` }" />
      <button v-for="m in modes" :key="m" class="seg-btn" :class="{ 'is-on': mode === m }" @click="$emit('update:mode', m)">{{ m }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ChevronDown, Heart } from '@lucide/vue'
import type { Anime } from '~/services/api/types'
const props = defineProps<{ animeList: Anime[]; tags: string[]; mode: string }>()
const emit = defineEmits<{ 'update:filters': [f: any]; 'update:mode': [m: string] }>()
const local = reactive({ animeId: '', tag: '', favourite: false })
const openDd = ref<string | null>(null)
const modes = ['masonry', 'grid', 'compact']
const modeIndex = computed(() => Math.max(0, modes.indexOf(props.mode)))

const selectedAnimeLabel = computed(() => {
  const a = props.animeList.find((x) => x.id === local.animeId)
  return a ? a.title : 'All anime'
})

const toggle = (name: string) => { openDd.value = openDd.value === name ? null : name }
const pickAnime = (id: string) => { local.animeId = id; openDd.value = null; emitFilters() }
const pickTag = (t: string) => { local.tag = t; openDd.value = null; emitFilters() }
const emitFilters = () => emit('update:filters', { animeId: local.animeId || undefined, tag: local.tag || undefined, favourite: local.favourite || undefined })
const toggleFav = () => { local.favourite = !local.favourite; emitFilters() }

// close on outside click
if (import.meta.client) {
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (!t.closest('.pill-dropdown')) openDd.value = null
  })
}
</script>

<style scoped>
.filterbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 0; }
.pill-dropdown { position: relative; }
.pill-dropdown__trigger { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius-pill); background: var(--elevated); border: 1px solid var(--border); color: var(--text); font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; }
.pill-dropdown__menu { position: absolute; top: calc(100% + 6px); left: 0; min-width: 200px; max-height: 280px; overflow-y: auto; background: var(--elevated); border: 1px solid var(--border); border-radius: 16px; padding: 6px; z-index: 30; box-shadow: 0 12px 32px rgba(0,0,0,0.25); }
.pill-dropdown__item { display: block; width: 100%; text-align: left; padding: 8px 12px; border-radius: 10px; background: transparent; border: none; color: var(--text-2); font-size: 13px; cursor: pointer; }
.pill-dropdown__item:hover { background: var(--surface); color: var(--text); }
.pill-dropdown__item.is-active { color: var(--accent); }
.toggle-pill { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius-pill); background: var(--elevated); border: 1px solid var(--border); color: var(--text-2); font-size: 13px; cursor: pointer; }
.toggle-pill.is-on { background: var(--accent); color: #f1efe8; border-color: var(--accent); }
.seg-control { position: relative; display: inline-flex; background: var(--elevated); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 3px; margin-left: auto; }
.seg-indicator { position: absolute; top: 3px; left: 3px; width: calc((100% - 6px) / 3); height: calc(100% - 6px); background: var(--accent); border-radius: var(--radius-pill); transition: transform 0.2s ease; }
.seg-btn { position: relative; z-index: 1; padding: 6px 14px; border: none; background: transparent; color: var(--text-2); font-size: 12px; cursor: pointer; border-radius: var(--radius-pill); text-transform: capitalize; }
.seg-btn.is-on { color: #f1efe8; }
</style>
