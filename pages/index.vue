<template>
  <div>
    <section class="masthead">
      <!-- 集中線 speed-line burst; decorative. -->
      <div class="masthead__lines speedlines" aria-hidden="true"></div>
      <p class="masthead__side vtext" aria-hidden="true">記録</p>

      <div class="masthead__copy">
        <motion.p
          class="masthead__kicker"
          :initial="heroRise"
          :animate="heroSettle"
          :transition="heroTransition(0.05)"
        >
          <span class="masthead__ep">EP.01</span>
          Private frame collection
        </motion.p>

        <motion.h1
          class="masthead__title"
          :initial="heroRise"
          :animate="heroSettle"
          :transition="heroTransition(0.14)"
        >
          The wall
        </motion.h1>

        <motion.p
          class="masthead__sub"
          :initial="heroRise"
          :animate="heroSettle"
          :transition="heroTransition(0.24)"
        >
          {{ frames.length }} frames preserved. Click a frame to view it full size;
          arrow keys move between neighbors.
        </motion.p>

        <motion.ul
          class="masthead__chips"
          :initial="heroRise"
          :animate="heroSettle"
          :transition="heroTransition(0.34)"
        >
          <li class="masthead__chip">
            <span class="masthead__chip-num">{{ frames.length }}</span>
            <span class="masthead__chip-label">Frames</span>
          </li>
          <li class="masthead__chip">
            <span class="masthead__chip-num">{{ allAnime.length }}</span>
            <span class="masthead__chip-label">Series</span>
          </li>
          <li class="masthead__chip">
            <span class="masthead__chip-num">{{ favoriteCount }}</span>
            <span class="masthead__chip-label">Starred</span>
          </li>
        </motion.ul>
      </div>
    </section>

    <GalleryToolbar
      class="gallery-view__toolbar"
      :filters="filters"
      :animes="allAnime"
      :has-active-filters="hasActiveFilters"
      @update="patchFilters"
      @reset="resetFilters"
    />

    <p class="gallery-view__count" role="status">
      Showing {{ filteredFrames.length }} of {{ frames.length }} frames
    </p>

    <div v-if="isLoading" class="gallery-view__state">
      <p class="gallery-view__state-text">Hanging the frames…</p>
    </div>

    <div v-else-if="loadError" class="gallery-view__state" role="alert">
      <p class="gallery-view__state-text">{{ loadError }}</p>
      <button type="button" class="gallery-view__retry" @click="load">Try again</button>
    </div>

    <!-- Nuxt auto-import names are directory-prefixed: components/gallery/
         EmptyState.vue registers as GalleryEmptyState (and FrameDialog.vue as
         GalleryFrameDialog). Referencing the bare names left them unresolved
         and, worse, unbundled - so they rendered as unknown elements. -->
    <GalleryEmptyState
      v-else-if="frames.length === 0"
      title="The wall is bare"
      message="Nothing has been archived yet. Add the first frame to start the collection."
    >
      <NuxtLink to="/upload" class="gallery-view__cta">Add the first frame</NuxtLink>
    </GalleryEmptyState>

    <GalleryEmptyState
      v-else-if="filteredFrames.length === 0"
      title="Nothing matches"
      message="No frames match the current search and filters. Loosen them and look again."
    >
      <button type="button" class="gallery-view__cta gallery-view__cta--quiet" @click="resetFilters">
        Clear filters
      </button>
    </GalleryEmptyState>

    <GalleryGrid
      v-else
      :frames="filteredFrames"
      @open="openDialog"
      @toggle-favorite="toggleFavorite"
    />

    <GalleryFrameDialog
      :frame="selectedFrame"
      :has-prev="dialogIndex > 0"
      :has-next="dialogIndex < filteredFrames.length - 1"
      @close="closeDialog"
      @navigate="stepDialog"
      @toggle-favorite="toggleFavorite"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { useFrames, type FrameFilters } from '~/composables/useFrames'
import type { Frame } from '~/services/storage/types'

const {
  frames,
  isLoading,
  loadError,
  filters,
  allAnime,
  filteredFrames,
  hasActiveFilters,
  load,
  toggleFavorite,
  resetFilters,
} = useFrames()

const selectedIndex = ref<number | null>(null)

/*
 * Hero choreography: staggered spring rise like an episode title card.
 * Under prefers-reduced-motion the initial state disables itself and every
 * transition collapses to zero duration.
 */
const reduceMotion = useReducedMotion()
const heroRise = computed(() => (reduceMotion.value ? false : { opacity: 0, y: 26 }))
const heroSettle = { opacity: 1, y: 0 }

function heroTransition(delay: number) {
  return reduceMotion.value
    ? ({ duration: 0 } as const)
    : ({ type: 'spring', stiffness: 250, damping: 26, delay } as const)
}

const favoriteCount = computed(
  () => frames.value.filter((frame) => frame.favorite).length,
)

const selectedFrame = computed<Frame | null>(() =>
  selectedIndex.value === null ? null : filteredFrames.value[selectedIndex.value] ?? null,
)

const dialogIndex = computed(() => selectedIndex.value ?? 0)

onMounted(() => {
  void load()
})

function openDialog(frame: Frame): void {
  const index = filteredFrames.value.findIndex((candidate) => candidate.id === frame.id)
  selectedIndex.value = index === -1 ? null : index
}

function closeDialog(): void {
  selectedIndex.value = null
}

function stepDialog(direction: 1 | -1): void {
  if (selectedIndex.value === null) return
  const next = selectedIndex.value + direction
  if (next >= 0 && next < filteredFrames.value.length) {
    selectedIndex.value = next
  }
}

function patchFilters(patch: Partial<FrameFilters>): void {
  filters.value = { ...filters.value, ...patch }
}

useHead({
  title: 'Anime Archive — The wall',
})
</script>

<style scoped>
.masthead {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-5);
  margin-bottom: var(--space-7);
  padding: var(--space-6) 0 var(--space-7);
}

.masthead__lines {
  position: absolute;
  inset: -48px -24% -8px;
  pointer-events: none;
}

/* Outlined vertical 記録 anchored beside the headline. */
.masthead__side {
  display: none;
  flex: none;
  margin-top: var(--space-2);
  font-size: clamp(44px, 6vw, 64px);
  font-weight: 800;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 93, 143, 0.55);
  filter: drop-shadow(0 0 14px rgba(255, 93, 143, 0.25));
}

.masthead__copy {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.masthead__kicker {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--step-1);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--paper-200);
}

.masthead__ep {
  padding: 2px var(--space-2);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--wall-950);
  background: var(--neon);
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%);
  box-shadow: 0 0 14px rgba(89, 224, 255, 0.45);
}

.masthead__title {
  font-size: clamp(var(--step-7), 9vw, 96px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.02;
  color: var(--paper-100);
}

/* Skewed gradient underline beneath the headline. */
.masthead__title::after {
  content: '';
  display: block;
  width: 96px;
  height: 6px;
  margin-top: var(--space-3);
  background: linear-gradient(90deg, var(--sakura), var(--neon));
  clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
}

.masthead__sub {
  max-width: 54ch;
  font-size: var(--step-4);
  color: var(--paper-200);
}

.masthead__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.masthead__chip {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(17, 22, 41, 0.72);
  border: 1px solid var(--wall-line);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
}

.masthead__chip-num {
  font-family: var(--font-display);
  font-size: var(--step-5);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--paper-100);
}

.masthead__chip:nth-child(2) .masthead__chip-num {
  color: var(--neon);
}

.masthead__chip:nth-child(3) .masthead__chip-num {
  color: var(--sunset);
}

.masthead__chip-label {
  font-size: var(--step-1);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--paper-200);
  opacity: 0.7;
}

@media (min-width: 900px) {
  .masthead__side {
    display: block;
  }
}

.gallery-view__toolbar {
  margin-bottom: var(--space-4);
}

.gallery-view__count {
  margin-bottom: var(--space-5);
  font-size: var(--step-1);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--paper-200);
  opacity: 0.6;
}

.gallery-view__state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-8) var(--space-6);
  border: 1px dashed rgba(89, 224, 255, 0.35);
  background: rgba(17, 22, 41, 0.5);
}

.gallery-view__state-text {
  font-size: var(--step-4);
  color: var(--paper-200);
}

.gallery-view__retry,
.gallery-view__cta {
  padding: var(--space-3) var(--space-5);
  font-size: var(--step-2);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-decoration: none;
  color: var(--wall-950);
  background: var(--sakura);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
  transition: box-shadow var(--dur-fast) var(--ease-frame),
    background var(--dur-fast) var(--ease-frame),
    color var(--dur-fast) var(--ease-frame);
}

.gallery-view__retry:hover,
.gallery-view__cta:hover {
  background: #ff7ba3;
  box-shadow: var(--glow-sakura);
}

/* Quiet variant sits on the paper (manga-panel) empty state: ink on paper. */
.gallery-view__cta--quiet {
  color: var(--ink-900);
  background: transparent;
  border: 2px solid var(--ink-900);
}

.gallery-view__cta--quiet:hover {
  color: var(--paper-100);
  background: var(--ink-900);
  box-shadow: none;
}
</style>
