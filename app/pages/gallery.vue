<template>
  <div class="gallery">
    <div class="gallery__head">
      <h1 class="page-title">Gallery</h1>
      <p class="page-sub">{{ items.length }} moments in the archive</p>
    </div>
    <button class="filter-toggle" @click="showFilters = !showFilters">Filters</button>
    <div class="filter-sheet" :class="{ 'is-open': showFilters }">
      <FilterBar
        :anime-list="animeList"
        :tags="tags"
        :mode="viewMode"
        @update:filters="onFilters"
        @update:mode="viewMode = $event as any"
      />
    </div>
    <div v-if="selected.size" class="selection-bar">
      <span>{{ selected.size }} selected</span>
      <button class="btn" @click="clearSelection">Clear</button>
    </div>
    <GalleryGrid
      :items="items"
      :loading="loading"
      :mode="viewMode"
      :selected="selected"
      @toggle-select="toggleSelect"
      @toggle-favourite="handleFav"
      @open="openViewer"
    />
    <ImageViewer v-if="viewerOpen" :items="items" :start-id="viewerStart" @close="viewerOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { api } from '~/services/api/client'
import type { Screenshot, Anime } from '~/services/api/types'
import { useGallery } from '~/composables/useGallery'

const { items, loading, viewMode, selected, filters, load, toggleSelect, clearSelection, toggleFavourite } = useGallery()
const animeList = ref<Anime[]>([])
const tags = computed(() => Array.from(new Set(items.value.flatMap((s) => s.tags))))
const viewerOpen = ref(false)
const viewerStart = ref('')
const showFilters = ref(false)

const onFilters = (f: any) => { filters.value = f; load() }
const handleFav = async (id: string) => { await toggleFavourite(id) }
const openViewer = (id: string) => { viewerStart.value = id; viewerOpen.value = true }

onMounted(async () => {
  animeList.value = await api.listAnime()
  await load()
})
</script>

<style scoped>
.gallery { display: flex; flex-direction: column; gap: 16px; }
.page-title { font-family: 'Newsreader', serif; font-size: 32px; margin: 0; }
.page-sub { color: var(--text-secondary); margin: 4px 0 0; font-size: 13px; }
.selection-bar { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--accent); border-radius: 4px; }
.filter-toggle { display: none; padding: 8px 14px; border-radius: 4px; background: var(--surface); border: 1px solid var(--border); color: var(--text); cursor: pointer; font-size: 13px; }
.filter-sheet { }
@media (max-width: 767px) {
  .filter-toggle { display: inline-block; }
  .filter-sheet { position: fixed; left: 0; right: 0; bottom: 0; background: var(--surface); border-top: 1px solid var(--border); padding: 16px; transform: translateY(100%); transition: transform 0.25s; z-index: 40; border-radius: 12px 12px 0 0; }
  .filter-sheet.is-open { transform: translateY(0); }
}
.btn { padding: 6px 12px; border-radius: 4px; background: var(--surface-elevated); border: 1px solid var(--border); color: var(--text); cursor: pointer; font-size: 12px; }
</style>
