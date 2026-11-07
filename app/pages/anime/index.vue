<template>
  <div class="anime-page">
    <div class="page-head">
      <h1 class="page-title">Anime Library</h1>
      <input v-model="q" class="search-input" placeholder="Search anime..." />
    </div>
    <div class="anime-grid">
      <AnimeCard v-for="a in filtered" :key="a.id" :anime="a" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '~/services/api/client'
import type { Anime } from '~/services/api/types'
const list = ref<Anime[]>([])
const q = ref('')
const filtered = computed(() => list.value.filter((a) => a.title.toLowerCase().includes(q.value.toLowerCase())))
onMounted(async () => { list.value = await api.listAnime() })
</script>
<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.page-title { font-family: 'Newsreader', serif; font-size: 32px; margin: 0; }
.search-input { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 12px; font-size: 13px; min-width: 220px; }
.anime-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
</style>
