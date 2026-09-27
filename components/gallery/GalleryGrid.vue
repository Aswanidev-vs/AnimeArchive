<template>
  <ul class="grid">
    <li v-for="(frame, index) in frames" :key="frame.id" class="grid__cell">
      <!-- Directory-prefixed auto-import name (components/gallery/FrameCard.vue
           registers as GalleryFrameCard). -->
      <GalleryFrameCard
        :frame="frame"
        :index="index"
        @open="emit('open', $event)"
        @toggle-favorite="emit('toggle-favorite', $event)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { Frame } from '~/services/storage/types'

defineProps<{
  frames: Frame[]
}>()

const emit = defineEmits<{
  open: [frame: Frame]
  'toggle-favorite': [id: string]
}>()
</script>

<style scoped>
/*
 * Screening room wall: stable auto-fill columns, breathing gutters so each
 * title card reads as its own exhibit. Cells stay top-aligned.
 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: var(--space-7) var(--space-5);
  align-items: start;
}

@media (min-width: 768px) {
  .grid {
    gap: var(--space-8) var(--space-6);
  }
}
</style>
