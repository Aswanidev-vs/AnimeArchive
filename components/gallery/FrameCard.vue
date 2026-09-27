<template>
  <figure
    ref="root"
    class="frame"
    :class="{ 'is-revealed': isRevealed }"
    :style="{ '--frame-i': String(index) }"
  >
    <div class="frame__figure">
      <button
        type="button"
        class="frame__open"
        :aria-label="`Open frame: ${frame.title || 'Untitled'}`"
        @click="emit('open', frame)"
      >
        <img
          class="frame__image"
          :src="frame.src"
          :alt="frame.title || 'Archive frame'"
          :width="frame.width || 1600"
          :height="frame.height || 900"
          loading="lazy"
          decoding="async"
        >
        <!-- Shine sweep on hover. -->
        <span class="frame__glint" aria-hidden="true"></span>
        <span class="frame__veil" aria-hidden="true"></span>
        <!-- Film-style timecode burn-in. -->
        <span v-if="frame.timestamp" class="frame__burnin" aria-hidden="true">
          {{ frame.timestamp }}
        </span>
      </button>

      <button
        type="button"
        class="frame__fav"
        :class="{ 'is-on': frame.favorite }"
        :aria-pressed="frame.favorite"
        :aria-label="frame.favorite ? `Remove “${frame.title}” from favorites` : `Add “${frame.title}” to favorites`"
        @click.stop="emit('toggle-favorite', frame.id)"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M8 1.8 9.9 5.6 14.1 6.2 11 9.2 11.8 13.4 8 11.4 4.2 13.4 5 9.2 1.9 6.2 6.1 5.6Z" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <figcaption class="frame__caption">
      <p class="frame__title">{{ frame.title || 'Untitled frame' }}</p>
      <p class="frame__meta">
        <span v-if="frame.anime" class="frame__anime">{{ frame.anime }}</span>
        <span v-if="frame.anime && frame.episode" class="frame__sep" aria-hidden="true">·</span>
        <span v-if="frame.episode" class="frame__episode">{{ frame.episode }}</span>
        <span v-if="frame.episode && frame.timestamp" class="frame__sep" aria-hidden="true">·</span>
        <span v-if="frame.timestamp" class="frame__time">{{ frame.timestamp }}</span>
      </p>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import type { Frame } from '~/services/storage/types'

withDefaults(
  defineProps<{
    frame: Frame
    /** Position in the grid, used only for the staggered reveal delay. */
    index?: number
  }>(),
  { index: 0 },
)

const emit = defineEmits<{
  open: [frame: Frame]
  'toggle-favorite': [id: string]
}>()

/*
 * Scroll reveal. The card starts hidden ONLY under `@media (scripting: enabled)`
 * (see the style block), so SSR/no-JS renders it plainly visible. When JS runs,
 * this observer flips the card visible as it enters the viewport, then stops.
 *
 * Markup note: the outer element is a <figure> (image + caption), with the
 * notched visual "mount" as an inner <div> — a <figcaption> must sit inside
 * its <figure>, so the previous article>figure>figcaption split was invalid.
 */
const root = ref<HTMLElement | null>(null)
const isRevealed = ref(false)

const observer = useIntersectionObserver(
  root,
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      isRevealed.value = true
      observer.stop()
    }
  },
  { threshold: 0.12, rootMargin: '0px 0px -32px 0px' },
)

onMounted(() => {
  // Ancient browsers: never leave the card stuck hidden.
  if (typeof IntersectionObserver === 'undefined') {
    isRevealed.value = true
  }
})
</script>

<style scoped>
/*
 * Episode title card: notched corner with a sakura→neon gradient matte,
 * drop-shadow glow (follows the clip-path silhouette on hover), shine sweep,
 * timecode burn-in, and a scroll reveal that only engages when JS is present.
 */
.frame {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transition: opacity var(--dur-reveal) var(--ease-snap),
    transform var(--dur-reveal) var(--ease-snap);
  transition-delay: calc(min(var(--frame-i), 5) * 60ms);
}

@media (scripting: enabled) {
  .frame {
    opacity: 0;
    transform: translateY(24px);
  }

  .frame.is-revealed {
    opacity: 1;
    transform: none;
  }
}

.frame__figure {
  position: relative;
  border: 0;
  padding: var(--space-2);
  /* The "mount": gradient shows through the matte ring and the notch. */
  background: linear-gradient(
      45deg,
      transparent 52%,
      rgba(89, 224, 255, 0.4) 76%,
      rgba(255, 93, 143, 0.9) 100%
    ),
    var(--wall-900);
  clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);
  transition: transform var(--dur-base) var(--ease-frame),
    filter var(--dur-base) var(--ease-frame);
}

.frame:hover .frame__figure {
  transform: translateY(-4px);
  filter: drop-shadow(0 0 18px rgba(255, 93, 143, 0.35));
}

.frame__open {
  display: block;
  width: 100%;
  position: relative;
  overflow: hidden;
  cursor: zoom-in;
}

.frame__image {
  width: 100%;
  height: auto;
  aspect-ratio: auto;
  transition: transform var(--dur-base) var(--ease-frame),
    filter var(--dur-base) var(--ease-frame);
}

.frame__open:hover .frame__image,
.frame__open:focus-visible .frame__image {
  transform: scale(1.02);
  filter: brightness(1.06) saturate(1.05);
}

/* Shine sweep: parked off-canvas until hover plays the `glint` keyframe. */
.frame__glint {
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: -35%;
  width: 36%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
  transform: translateX(-140%) skewX(-18deg);
  pointer-events: none;
}

.frame__open:hover .frame__glint,
.frame__open:focus-visible .frame__glint {
  animation: glint 800ms var(--ease-frame);
}

.frame__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(11, 14, 26, 0.72), transparent 45%);
  opacity: 0;
  transition: opacity var(--dur-base) var(--ease-frame);
  pointer-events: none;
}

.frame__open:hover .frame__veil,
.frame__open:focus-visible .frame__veil {
  opacity: 1;
}

/* Film-style timecode burn-in, bottom-right of the still. */
.frame__burnin {
  position: absolute;
  right: var(--space-2);
  bottom: var(--space-2);
  padding: 2px var(--space-2);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  color: var(--neon);
  background: rgba(11, 14, 26, 0.8);
  border: 1px solid rgba(89, 224, 255, 0.35);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-frame);
  pointer-events: none;
}

.frame__open:hover .frame__burnin,
.frame__open:focus-visible .frame__burnin {
  opacity: 1;
}

/* Favorite star lives top-left; the notch owns the top-right corner. */
.frame__fav {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--paper-100);
  background: rgba(11, 14, 26, 0.75);
  border: 1px solid var(--wall-line);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-frame),
    color var(--dur-fast) var(--ease-frame),
    border-color var(--dur-fast) var(--ease-frame),
    background var(--dur-fast) var(--ease-frame);
}

.frame:hover .frame__fav,
.frame__fav:focus-visible,
.frame__fav.is-on {
  opacity: 1;
}

.frame__fav:hover {
  color: var(--sunset);
  border-color: rgba(255, 179, 71, 0.6);
}

.frame__fav.is-on {
  color: var(--sunset);
  border-color: rgba(255, 179, 71, 0.6);
  background: rgba(11, 14, 26, 0.9);
  animation: star-pop 400ms var(--ease-snap);
}

.frame__caption {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: 0 var(--space-1);
}

.frame__title {
  font-family: var(--font-display);
  font-size: var(--step-4);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--paper-100);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  transition: color var(--dur-fast) var(--ease-frame);
}

.frame:hover .frame__title {
  color: #ffffff;
}

.frame__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--step-1);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--paper-200);
  opacity: 0.75;
}

.frame__anime {
  color: var(--neon);
}

.frame__episode {
  color: var(--sakura);
}

.frame__time {
  color: var(--sunset);
}

.frame__sep {
  opacity: 0.5;
}
</style>
