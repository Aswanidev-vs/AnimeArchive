<template>
  <AnimatePresence>
    <motion.div
      v-if="frame"
      key="frame-dialog"
      class="dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="`Frame detail: ${frame.title || 'Untitled'}`"
      :initial="overlayInitial"
      :animate="{ opacity: 1 }"
      :exit="overlayExit"
      @keydown="onKeydown"
    >
      <div class="dialog__backdrop" @click="emit('close')"></div>

      <motion.figure
        class="dialog__panel"
        :initial="panelInitial"
        :animate="panelSettle"
        :transition="panelTransition"
      >
        <!-- Eyecatch header strip; decorative. -->
        <div class="dialog__eyecatch" aria-hidden="true">
          <span class="dialog__eyecatch-jp">詳細</span>
          <span class="dialog__eyecatch-label">Frame detail</span>
          <span class="dialog__eyecatch-bar"></span>
        </div>
      <button
        ref="closeButton"
        type="button"
        class="dialog__close"
        aria-label="Close frame detail"
        @click="emit('close')"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="m3 3 10 10M13 3 3 13" stroke-linecap="round" />
        </svg>
      </button>

      <div class="dialog__stage">
        <button
          v-if="hasPrev"
          type="button"
          class="dialog__nav dialog__nav--prev"
          aria-label="Previous frame"
          @click="emit('navigate', -1)"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M10 3 5 8l5 5" stroke-linecap="square" />
          </svg>
        </button>

        <img
          class="dialog__image"
          :src="frame.src"
          :alt="frame.title || 'Archive frame'"
          :width="frame.width || undefined"
          :height="frame.height || undefined"
        >

        <button
          v-if="hasNext"
          type="button"
          class="dialog__nav dialog__nav--next"
          aria-label="Next frame"
          @click="emit('navigate', 1)"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="m6 3 5 5-5 5" stroke-linecap="square" />
          </svg>
        </button>
      </div>

      <figcaption class="dialog__caption">
        <div class="dialog__heading">
          <h2 class="dialog__title">{{ frame.title || 'Untitled frame' }}</h2>
          <button
            type="button"
            class="dialog__fav"
            :class="{ 'is-on': frame.favorite }"
            :aria-pressed="frame.favorite"
            :aria-label="frame.favorite ? 'Remove from favorites' : 'Add to favorites'"
            @click="emit('toggle-favorite', frame.id)"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">
              <path d="M8 1.8 9.9 5.6 14.1 6.2 11 9.2 11.8 13.4 8 11.4 4.2 13.4 5 9.2 1.9 6.2 6.1 5.6Z" stroke-linejoin="round" />
            </svg>
            {{ frame.favorite ? 'Starred' : 'Star' }}
          </button>
        </div>

        <dl class="dialog__meta">
          <div v-if="frame.anime" class="dialog__row">
            <dt>Series</dt>
            <dd>{{ frame.anime }}</dd>
          </div>
          <div v-if="frame.episode" class="dialog__row">
            <dt>Episode</dt>
            <dd>{{ frame.episode }}</dd>
          </div>
          <div v-if="frame.timestamp" class="dialog__row">
            <dt>Timecode</dt>
            <dd>{{ frame.timestamp }}</dd>
          </div>
          <div v-if="frame.tags.length" class="dialog__row">
            <dt>Tags</dt>
            <dd>
              <ul class="dialog__tags">
                <li v-for="tag in frame.tags" :key="tag">{{ tag }}</li>
              </ul>
            </dd>
          </div>
          <div v-if="frame.note" class="dialog__row dialog__row--note">
            <dt>Note</dt>
            <dd>{{ frame.note }}</dd>
          </div>
        </dl>

        <p v-if="isSessionOnly" class="dialog__warning" role="note">
          This image is shown from the current session only — it will not appear after the page is reloaded.
        </p>
      </figcaption>
      </motion.figure>
    </motion.div>
  </AnimatePresence>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { AnimatePresence, motion, useReducedMotion } from 'motion-v'
import type { Frame } from '~/services/storage/types'

const props = defineProps<{
  frame: Frame | null
  hasPrev: boolean
  hasNext: boolean
}>()

const emit = defineEmits<{
  close: []
  navigate: [direction: 1 | -1]
  'toggle-favorite': [id: string]
}>()

const closeButton = ref<HTMLButtonElement | null>(null)

/*
 * Eyecatch choreography. prefers-reduced-motion disables the initial state and
 * collapses every transition - including the AnimatePresence exit - to zero
 * duration. base.css cannot reach motion-v's JS-driven animations, so this
 * gate has to be explicit.
 */
const reduceMotion = useReducedMotion()
const overlayInitial = computed(() => (reduceMotion.value ? false : { opacity: 0 }))
const overlayExit = computed(() =>
  reduceMotion.value
    ? { opacity: 0, transition: { duration: 0 } }
    : { opacity: 0, transition: { duration: 0.2 } },
)
const panelInitial = computed(() =>
  reduceMotion.value ? false : { opacity: 0, y: 28, scale: 0.96 },
)
const panelSettle = { opacity: 1, y: 0, scale: 1 }
const panelTransition = computed(() =>
  reduceMotion.value
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 300, damping: 28 } as const),
)

/** The local adapter appends SESSION_ONLY_SRC_NOTE to notes for non-durable srcs. */
const SESSION_ONLY_MARKER = 'will not return after the page is reloaded'
const isSessionOnly = computed(() => props.frame?.note.includes(SESSION_ONLY_MARKER) === true)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  } else if (event.key === 'ArrowLeft' && props.hasPrev) {
    event.preventDefault()
    emit('navigate', -1)
  } else if (event.key === 'ArrowRight' && props.hasNext) {
    event.preventDefault()
    emit('navigate', 1)
  } else if (event.key === 'Tab') {
    // Hand-rolled focus trap: cycle Tab / Shift+Tab inside the dialog root.
    const root = event.currentTarget as HTMLElement | null
    if (!root) return
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || !root.contains(active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || !root.contains(active))) {
      event.preventDefault()
      first.focus()
    }
  }
}

function lockScroll(): void {
  document.body.style.overflow = 'hidden'
}

function unlockScroll(): void {
  document.body.style.overflow = ''
}

let lastFocused: HTMLElement | null = null

watch(
  () => props.frame,
  (frame, previous) => {
    if (frame) {
      lockScroll()
      // Remember the trigger only on first open so arrow navigation between
      // frames does not overwrite it with the close button.
      if (!previous) {
        lastFocused =
          document.activeElement instanceof HTMLElement ? document.activeElement : null
      }
      void nextTick(() => closeButton.value?.focus())
    } else {
      unlockScroll()
      // Return focus to whatever opened the dialog.
      lastFocused?.focus()
      lastFocused = null
    }
  },
)

onUnmounted(unlockScroll)
</script>

<style scoped>
.dialog {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(6, 8, 16, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.dialog__panel {
  position: relative;
  width: min(960px, 100%);
  max-height: calc(100vh - var(--space-6));
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: var(--wall-900);
  clip-path: polygon(
    0 0,
    calc(100% - var(--cut-lg)) 0,
    100% var(--cut-lg),
    100% 100%,
    var(--cut-lg) 100%,
    0 calc(100% - var(--cut-lg))
  );
  /* Neon haze that follows the clipped silhouette. */
  filter: drop-shadow(0 0 50px rgba(89, 224, 255, 0.12));
}

/* Eyecatch header strip. */
.dialog__eyecatch {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: linear-gradient(90deg, rgba(255, 93, 143, 0.18), rgba(89, 224, 255, 0.12));
  border-bottom: 1px solid var(--wall-line);
}

.dialog__eyecatch-jp {
  font-family: var(--font-display);
  font-size: var(--step-4);
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--sakura);
}

.dialog__eyecatch-label {
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--paper-200);
  opacity: 0.7;
}

.dialog__eyecatch-bar {
  margin-left: auto;
  width: 90px;
  height: 4px;
  background: repeating-linear-gradient(90deg, var(--neon) 0 8px, transparent 8px 14px);
  opacity: 0.5;
}

.dialog__close {
  position: absolute;
  top: calc(var(--cut-lg) + 10px);
  right: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--paper-100);
  background: rgba(11, 14, 26, 0.85);
  border: 1px solid var(--wall-line);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  transition: background var(--dur-fast) var(--ease-frame),
    color var(--dur-fast) var(--ease-frame),
    box-shadow var(--dur-fast) var(--ease-frame);
}

.dialog__close:hover {
  background: var(--sakura);
  color: var(--wall-950);
  box-shadow: var(--glow-sakura);
}

.dialog__stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wall-950);
  padding: var(--space-5);
}

/* Projection vignette. */
.dialog__stage::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 80px rgba(6, 8, 16, 0.6);
}

.dialog__image {
  position: relative;
  max-width: 100%;
  max-height: 62vh;
  width: auto;
  height: auto;
  border: 1px solid rgba(89, 224, 255, 0.25);
}

.dialog__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 52px;
  color: var(--paper-100);
  background: rgba(11, 14, 26, 0.8);
  border: 1px solid var(--wall-line);
  transition: background var(--dur-fast) var(--ease-frame),
    color var(--dur-fast) var(--ease-frame),
    box-shadow var(--dur-fast) var(--ease-frame);
}

.dialog__nav:hover {
  background: var(--sakura);
  color: var(--wall-950);
  box-shadow: var(--glow-sakura);
}

.dialog__nav--prev {
  left: var(--space-3);
}

.dialog__nav--next {
  right: var(--space-3);
}

.dialog__caption {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  border-top: 1px solid var(--wall-line);
}

.dialog__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.dialog__title {
  font-size: var(--step-6);
  color: var(--paper-100);
}

.dialog__fav {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--step-2);
  font-weight: 500;
  color: var(--paper-200);
  border: 1px solid var(--wall-line);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  transition: color var(--dur-fast) var(--ease-frame),
    border-color var(--dur-fast) var(--ease-frame);
}

.dialog__fav:hover {
  color: var(--sunset);
  border-color: rgba(255, 179, 71, 0.6);
}

.dialog__fav.is-on {
  color: var(--sunset);
  border-color: rgba(255, 179, 71, 0.6);
  animation: star-pop 400ms var(--ease-snap);
}

.dialog__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-4) var(--space-5);
}

.dialog__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.dialog__row--note {
  grid-column: 1 / -1;
}

.dialog__meta dt {
  font-size: var(--step-1);
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--neon);
  opacity: 0.7;
}

.dialog__meta dd {
  font-size: var(--step-3);
  color: var(--paper-100);
}

.dialog__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.dialog__tags li {
  padding: 2px var(--space-2);
  font-size: var(--step-1);
  letter-spacing: 0.04em;
  color: var(--paper-200);
  border: 1px solid var(--line-neon);
}

.dialog__warning {
  padding: var(--space-3) var(--space-4);
  font-size: var(--step-2);
  color: var(--sunset);
  border: 1px solid rgba(255, 179, 71, 0.4);
  background: rgba(255, 179, 71, 0.08);
}
</style>
