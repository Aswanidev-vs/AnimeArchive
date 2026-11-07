<template>
  <div v-if="anime" class="anime-detail">
    <div class="anime-detail__hero">
      <img :src="anime.coverUrl" :alt="anime.title" class="anime-detail__cover" />
      <div>
        <h1 class="page-title">{{ anime.title }}</h1>
        <p class="page-sub">{{ anime.altTitle }}</p>
        <p class="anime-detail__desc">{{ anime.description }}</p>
        <div class="anime-detail__stats">
          <span>{{ anime.screenshotCount }} screenshots</span>
          <span>{{ anime.episodeCount }} episodes</span>
        </div>
      </div>
    </div>
    <div class="episode-tabs">
      <button class="episode-tab" :class="{ 'is-on': !activeEpisode }" @click="activeEpisode = null">All</button>
      <button v-for="e in episodes" :key="e.id" class="episode-tab" :class="{ 'is-on': activeEpisode === e.id }" @click="activeEpisode = e.id">
        Ep {{ e.number }}{{ e.title ? ' · ' + e.title : '' }}
      </button>
    </div>
    <h3 class="section-title">Screenshots</h3>
    <GalleryGrid
      :items="filteredShots"
      :loading="loading"
      mode="masonry"
      :selected="new Set()"
      @open="openViewer"
    />
    <ImageViewer v-if="viewerOpen" :items="filteredShots" :start-id="viewerStart" @close="viewerOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '~/services/api/client'
import type { Anime, Screenshot, Episode } from '~/services/api/types'
const route = useRoute()
const anime = ref<Anime | null>(null)
const shots = ref<Screenshot[]>([])
const episodes = ref<Episode[]>([])
const loading = ref(true)
const viewerOpen = ref(false)
const viewerStart = ref('')
const activeEpisode = ref<string | null>(null)
const filteredShots = computed(() => activeEpisode.value ? shots.value.filter((s) => s.episodeId === activeEpisode.value) : shots.value)
const openViewer = (id: string) => { viewerStart.value = id; viewerOpen.value = true }
onMounted(async () => {
  const id = route.params.id as string
  anime.value = await api.getAnime(id)
  episodes.value = await api.listEpisodes(id)
  shots.value = await api.listScreenshots({ animeId: id })
  loading.value = false
})
</script>

<style scoped>
.anime-detail { display: flex; flex-direction: column; gap: 24px; }
.anime-detail__hero { display: grid; grid-template-columns: 200px 1fr; gap: 24px; align-items: start; }
.anime-detail__cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; border-radius: 12px; }
.anime-detail__desc { color: var(--text-secondary); margin: 12px 0; font-size: 14px; }
.anime-detail__stats { display: flex; gap: 16px; font-size: 12px; color: var(--text-muted); }
.page-title { font-family: 'Newsreader', serif; font-size: 32px; margin: 0; }
.page-sub { color: var(--text-muted); margin: 4px 0 0; font-size: 13px; }
.section-title { font-family: 'Newsreader', serif; font-size: 22px; margin: 8px 0 0; }
.episode-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.episode-tab { padding: 6px 12px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); font-size: 12px; cursor: pointer; }
.episode-tab.is-on { background: var(--accent); color: var(--bg); border-color: var(--accent); }
@media (max-width: 767px) { .anime-detail__hero { grid-template-columns: 1fr; } .anime-detail__cover { max-width: 200px; } }
</style>
