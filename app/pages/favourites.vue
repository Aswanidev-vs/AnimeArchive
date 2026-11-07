<template>
  <div class="fav">
    <h1 class="page-title">Favourites</h1>
    <GalleryGrid :items="items" :loading="loading" mode="masonry" :selected="new Set()" @open="openViewer" />
    <ImageViewer v-if="viewerOpen" :items="items" :start-id="viewerStart" @close="viewerOpen = false" />
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '~/services/api/client'
import type { Screenshot } from '~/services/api/types'
const items = ref<Screenshot[]>([])
const loading = ref(true)
const viewerOpen = ref(false)
const viewerStart = ref('')
const openViewer = (id: string) => { viewerStart.value = id; viewerOpen.value = true }
onMounted(async () => { items.value = await api.listScreenshots({ favourite: true }); loading.value = false })
</script>
<style scoped>
.page-title { font-family: 'Newsreader', serif; font-size: 32px; margin: 0 0 16px; }
</style>
