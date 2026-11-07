<template>
  <div class="col-card">
    <img v-if="collection.coverUrl" :src="collection.coverUrl" :alt="collection.name" class="col-card__cover" />
    <div class="col-card__body">
      <div class="col-card__name">{{ collection.name }}</div>
      <div class="col-card__desc">{{ collection.description }}</div>
      <div class="col-card__count">{{ collection.screenshotIds.length }} screenshots</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Collection } from '~/services/api/types'
defineProps<{ collection: Collection }>()
</script>
<style scoped>
.col-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-card); overflow: hidden; transition: transform 0.18s ease, box-shadow 0.18s ease; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
[data-theme='dark'] .col-card { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02); }
.col-card:hover { transform: translateY(-2px); border-color: var(--accent); }
.col-card__cover { width: 100%; aspect-ratio: 4/3; object-fit: cover; }
.col-card__body { padding: 20px; display: flex; flex-direction: column; gap: 6px; }
.col-card__name { font-family: 'Newsreader', serif; font-size: 18px; font-weight: 500; letter-spacing: -0.01em; }
.col-card__desc { font-size: 12px; color: var(--text-2); }
.col-card__count { font-size: 11px; color: var(--text-muted); }
</style>
