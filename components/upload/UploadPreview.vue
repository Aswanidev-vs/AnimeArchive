<template>
  <figure v-if="previewUrl" class="preview">
    <div class="preview__chrome" aria-hidden="true">
      <span class="preview__rec"></span>
      <span class="preview__label">Preview monitor</span>
    </div>

    <div class="preview__stage">
      <img
        class="preview__image"
        :src="previewUrl"
        :alt="`Preview of the frame to be added${model.title ? `: ${model.title}` : ''}`"
      >
    </div>

    <figcaption class="preview__caption">
      <p class="preview__title">{{ model.title || 'Untitled frame' }}</p>
      <p class="preview__meta">
        <span v-if="model.anime" class="preview__series">{{ model.anime }}</span>
        <span v-if="model.anime && model.episode" aria-hidden="true">·</span>
        <span v-if="model.episode">{{ model.episode }}</span>
        <span v-if="dimensions.width" aria-hidden="true">·</span>
        <span v-if="dimensions.width">{{ dimensions.width }} × {{ dimensions.height }} px</span>
      </p>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import type { UploadFormModel } from './UploadForm.vue'

defineProps<{
  previewUrl: string
  dimensions: { width: number; height: number }
  model: UploadFormModel
}>()
</script>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.preview__chrome {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--wall-900);
  border: 1px solid var(--wall-line);
  clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);
}

.preview__rec {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sakura);
  box-shadow: 0 0 8px rgba(255, 93, 143, 0.8);
  animation: twinkle 1.6s ease-in-out infinite;
}

.preview__label {
  font-size: 10px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--paper-200);
  opacity: 0.7;
}

.preview__stage {
  position: relative;
  border: 1px solid var(--wall-line);
  background: var(--wall-950);
  padding: var(--space-3);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  overflow: hidden;
}

/* Vignette so the still reads like a projection. */
.preview__stage::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 60px rgba(11, 14, 26, 0.55);
}

.preview__image {
  position: relative;
  max-width: 100%;
  max-height: 380px;
  width: auto;
  height: auto;
}

.preview__caption {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: 0 var(--space-1);
}

.preview__title {
  font-family: var(--font-display);
  font-size: var(--step-4);
  font-weight: 700;
  color: var(--paper-100);
}

.preview__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--step-1);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--paper-200);
  opacity: 0.7;
}

.preview__series {
  color: var(--neon);
}
</style>
