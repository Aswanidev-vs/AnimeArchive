<template>
  <div v-if="loading" class="skeleton-grid">
    <div v-for="i in 8" :key="i" class="skeleton" />
  </div>
  <div v-else-if="!items.length" class="empty-wrap">
    <EmptyState title="No screenshots yet" description="Upload your first moment to begin the archive." />
  </div>
  <div v-else :class="gridClass">
    <GalleryImageCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      :selected="selected.has(item.id)"
      :mode="mode"
      @toggle-select="toggleSelect(item.id)"
      @toggle-favourite="toggleFavourite(item.id)"
      @open="open(item.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Screenshot } from '~/services/api/types'
import GalleryImageCard from './GalleryImageCard.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps<{
  items: Screenshot[]
  loading?: boolean
  mode?: 'masonry' | 'grid' | 'compact'
  selected: Set<string>
}>()
const emit = defineEmits<{
  'toggle-select': [id: string]
  'toggle-favourite': [id: string]
  open: [id: string]
}>()

const toggleSelect = (id: string) => emit('toggle-select', id)
const toggleFavourite = (id: string) => emit('toggle-favourite', id)
const open = (id: string) => emit('open', id)

const gridClass = computed(() => {
  if (props.mode === 'grid') return 'grid-uniform'
  if (props.mode === 'compact') return 'grid-compact'
  return 'grid-masonry'
})
</script>

<style scoped>
.grid-masonry { columns: 3 240px; column-gap: 16px; }
.grid-masonry > * { break-inside: avoid; margin-bottom: 16px; }
.grid-uniform { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.grid-compact { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
.skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.skeleton { aspect-ratio: 3/4; background: var(--surface); border-radius: 4px; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
@media (max-width: 767px) {
  .grid-masonry { columns: 2 160px; }
  .grid-uniform { grid-template-columns: repeat(2, 1fr); }
}
</style>
