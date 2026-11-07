<template>
  <section class="home">
    <div class="home__greeting">
      <div>
        <p class="eyebrow">Your Archive</p>
        <h1 class="home__title">A collection of moments worth remembering.</h1>
        <p class="home__sub">{{ stats.total }} moments across {{ stats.anime }} titles.</p>
      </div>
      <NuxtLink to="/upload" class="btn btn--primary">Upload Moments</NuxtLink>
    </div>

    <div class="home__hero" v-if="featured">
      <img :src="featured.thumbUrl" :alt="featured.title" class="home__hero-img" />
      <div class="home__hero-meta">
        <p class="eyebrow">Featured moment</p>
        <h2>{{ featured.title }}</h2>
        <p>{{ featured.sceneTitle }} · {{ animeName(featured.animeId) }}</p>
        <NuxtLink :to="`/gallery`" class="btn btn--primary">Open in gallery</NuxtLink>
      </div>
    </div>

    <div class="home__stats">
      <div v-for="s in statItems" :key="s.label" class="stat">
        <div class="stat__value">{{ s.value }}</div>
        <div class="stat__label">{{ s.label }}</div>
      </div>
    </div>

    <div class="home__section">
      <div class="section-head">
        <h3>Recently added</h3>
        <NuxtLink to="/recent" class="link">View all</NuxtLink>
      </div>
      <GalleryGrid :items="recent" mode="compact" :selected="new Set()" />
    </div>

    <div class="home__section">
      <div class="section-head">
        <h3>Favourite anime</h3>
        <NuxtLink to="/anime" class="link">Browse library</NuxtLink>
      </div>
      <div class="anime-row">
        <AnimeCard v-for="a in favAnime" :key="a.id" :anime="a" />
      </div>
    </div>

    <div class="home__section">
      <div class="section-head">
        <h3>Recent collections</h3>
        <NuxtLink to="/collections" class="link">View all</NuxtLink>
      </div>
      <div class="col-row">
        <CollectionCard v-for="c in recentCollections" :key="c.id" :collection="c" />
      </div>
    </div>

    <div class="home__upload">
      <NuxtLink to="/upload" class="btn btn--primary">Upload new screenshots</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { api } from '~/services/api/client'
import type { Screenshot, Anime, Collection } from '~/services/api/types'

const recent = ref<Screenshot[]>([])
const favAnime = ref<Anime[]>([])
const recentCollections = ref<Collection[]>([])
const allScreenshots = ref<Screenshot[]>([])
const allAnime = ref<Anime[]>([])

const featured = computed(() => allScreenshots.value[0])
const stats = computed(() => ({
  total: allScreenshots.value.length,
  anime: allAnime.value.length,
  collections: recentCollections.value.length,
  favourites: allScreenshots.value.filter((s) => s.favourite).length,
}))
const statItems = computed(() => [
  { label: 'Screenshots', value: stats.value.total },
  { label: 'Anime indexed', value: stats.value.anime },
  { label: 'Collections', value: stats.value.collections },
  { label: 'Favourites', value: stats.value.favourites },
])

const animeName = (id: string) => allAnime.value.find((a) => a.id === id)?.title ?? ''

onMounted(async () => {
  const [shots, anime, cols] = await Promise.all([api.listScreenshots(), api.listAnime(), api.listCollections()])
  allScreenshots.value = shots
  allAnime.value = anime
  recent.value = shots.slice(0, 6)
  favAnime.value = anime.filter((a) => a.favourite).slice(0, 4)
  recentCollections.value = cols.slice(0, 3)
})
</script>

<style scoped>
.home { display: flex; flex-direction: column; gap: 40px; }
.home__greeting { display: flex; align-items: end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.eyebrow { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-muted); margin: 0 0 8px; }
.home__title { font-family: 'Newsreader', serif; font-size: 36px; font-weight: 600; margin: 0 0 8px; }
.home__sub { color: var(--text-secondary); margin: 0; }
.home__hero { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 20px; }
.home__hero-img { width: 100%; height: 420px; object-fit: cover; border-radius: 12px; }
.home__hero-meta h2 { font-family: 'Newsreader', serif; font-size: 24px; margin: 0 0 6px; }
.home__hero-meta p { color: var(--text-secondary); margin: 0 0 16px; }
.home__stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
.stat__value { font-family: 'Newsreader', serif; font-size: 28px; font-weight: 600; }
.stat__label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin-top: 4px; }
.home__section { display: flex; flex-direction: column; gap: 16px; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; }
.section-head h3 { font-family: 'Newsreader', serif; font-size: 20px; margin: 0; }
.link { font-size: 12px; color: var(--accent); }
.anime-row, .col-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.home__upload { padding-top: 8px; }
.btn { display: inline-block; padding: 10px 18px; border-radius: 12px; font-size: 13px; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text); transition: background-color 0.15s, border-color 0.15s; }
.btn--primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.btn--primary:hover { opacity: 0.9; }
@media (max-width: 767px) {
  .home__hero { grid-template-columns: 1fr; }
  .home__hero-img { height: 260px; }
  .home__stats { grid-template-columns: repeat(2, 1fr); }
  .home__title { font-size: 28px; }
}
</style>
