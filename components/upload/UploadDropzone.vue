<template>
  <div
    class="dropzone"
    :class="{ 'is-over': isOver }"
    @dragover.prevent="isOver = true"
    @dragleave.prevent="isOver = false"
    @drop.prevent="onDrop"
  >
    <input
      ref="input"
      type="file"
      class="dropzone__input"
      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
      aria-label="Choose an image file to add"
      @change="handleFileInput"
    >

    <button
      type="button"
      class="dropzone__hit"
      @click="input?.click()"
    >
      <!-- Cyan scanning line; engages on hover / drag. -->
      <span class="dropzone__scan" aria-hidden="true"></span>

      <svg class="dropzone__icon" viewBox="0 0 32 32" width="36" height="36" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2">
        <rect x="4" y="4" width="24" height="24" />
        <path d="M16 22V10M10.5 15.5 16 10l5.5 5.5" stroke-linecap="square" />
      </svg>

      <p class="dropzone__title">Set a frame on the wall</p>
      <p class="dropzone__hint">Drag an image here, or browse your files.</p>
      <p class="dropzone__limit">JPEG, PNG, WebP, GIF or AVIF — up to 25 MB.</p>
    </button>

    <p v-if="errors" class="dropzone__error" role="alert">{{ errors }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  errors: string
}>()

const emit = defineEmits<{
  'file-selected': [file: File]
}>()

const input = ref<HTMLInputElement | null>(null)
const isOver = ref(false)

// Keep the prop reference so linters do not flag the unused value; the error
// text is rendered directly above.
void props

function onDrop(event: DragEvent): void {
  isOver.value = false
  const dropped = event.dataTransfer?.files?.[0]
  if (dropped) {
    emit('file-selected', dropped)
  }
}

function handleFileInput(event: Event): void {
  const target = event.target as HTMLInputElement
  const chosen = target.files?.[0]
  if (chosen) {
    emit('file-selected', chosen)
  }
  target.value = ''
}
</script>

<style scoped>
.dropzone {
  position: relative;
}

.dropzone__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.dropzone__hit {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-5);
  overflow: hidden;
  text-align: center;
  color: var(--paper-200);
  background-color: rgba(17, 22, 41, 0.6);
  background-image: radial-gradient(rgba(246, 241, 231, 0.05) 1px, transparent 1.3px);
  background-size: 12px 12px;
  border: 1px dashed rgba(89, 224, 255, 0.35);
  clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);
  transition: border-color var(--dur-fast) var(--ease-frame),
    background-color var(--dur-fast) var(--ease-frame),
    color var(--dur-fast) var(--ease-frame),
    box-shadow var(--dur-fast) var(--ease-frame);
}

/* Corner brackets: neon at rest, sakura when engaged. */
.dropzone__hit::before,
.dropzone__hit::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  pointer-events: none;
  transition: border-color var(--dur-fast) var(--ease-frame);
}

.dropzone__hit::before {
  top: 7px;
  left: 7px;
  border-top: 2px solid rgba(89, 224, 255, 0.6);
  border-left: 2px solid rgba(89, 224, 255, 0.6);
}

.dropzone__hit::after {
  bottom: 7px;
  right: 7px;
  border-bottom: 2px solid rgba(89, 224, 255, 0.6);
  border-right: 2px solid rgba(89, 224, 255, 0.6);
}

/* Scanning line. */
.dropzone__scan {
  position: absolute;
  left: 0;
  right: 0;
  top: -4%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--neon), transparent);
  opacity: 0;
  pointer-events: none;
}

.dropzone__hit:hover,
.dropzone.is-over .dropzone__hit {
  border-color: var(--sakura);
  background-color: var(--wall-800);
  color: var(--paper-100);
  box-shadow: inset 0 0 48px rgba(255, 93, 143, 0.08);
}

.dropzone__hit:hover .dropzone__scan,
.dropzone.is-over .dropzone__scan {
  animation: scan-y 1.8s linear infinite;
}

.dropzone.is-over .dropzone__hit::before,
.dropzone.is-over .dropzone__hit::after {
  border-color: var(--sakura);
}

.dropzone__icon {
  color: var(--neon);
  margin-bottom: var(--space-2);
  filter: drop-shadow(0 0 8px rgba(89, 224, 255, 0.5));
  transition: color var(--dur-fast) var(--ease-frame),
    filter var(--dur-fast) var(--ease-frame);
}

.dropzone__hit:hover .dropzone__icon,
.dropzone.is-over .dropzone__icon {
  color: var(--sakura);
  filter: drop-shadow(0 0 10px rgba(255, 93, 143, 0.6));
}

.dropzone__title {
  font-family: var(--font-display);
  font-size: var(--step-5);
  font-weight: 700;
  color: var(--paper-100);
}

.dropzone__hint {
  font-size: var(--step-3);
}

.dropzone__limit {
  font-size: var(--step-1);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.55;
}

.dropzone__error {
  margin-top: var(--space-3);
  padding: var(--space-3) var(--space-4);
  font-size: var(--step-2);
  color: #ff8fb0;
  border: 1px solid var(--sakura);
  background: rgba(255, 93, 143, 0.08);
}
</style>
