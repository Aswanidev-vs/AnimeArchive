<template>
  <NuxtLink :to="`/anime/${anime.id}`" class="anime-card">
    <img :src="anime.coverUrl" :alt="anime.title" class="anime-card__cover" loading="lazy" />
    <div class="anime-card__body">
      <div class="anime-card__title">{{ anime.title }}</div>
      <div class="anime-card__sub">{{ anime.screenshotCount }} screenshots · {{ anime.episodeCount }} episodes</div>
      <div v-if="anime.favourite" class="anime-card__fav">★ Favourite</div>
    </div>
  </NuxtLink>
</template>
<script setup lang="ts">
import type { Anime } from '~/services/api/types'
defineProps<{ anime: Anime }>()
</script>
<style scoped>
.anime-card { display: block; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-card); overflow: hidden; transition: transform 0.18s ease, box-shadow 0.18s ease; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
[data-theme='dark'] .anime-card { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02); }
.anime-card:hover { transform: translateY(-2px); border-color: var(--accent); }
.anime-card__cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; }
.anime-card__body { padding: 20px; display: flex; flex-direction: column; gap: 6px; }
.anime-card__title { font-family: 'Newsreader', serif; font-size: 18px; font-weight: 500; letter-spacing: -0.01em; }
.anime-card__sub { font-size: 12px; color: var(--text-2); }
.anime-card__fav { font-size: 11px; color: var(--accent); }
</style>
