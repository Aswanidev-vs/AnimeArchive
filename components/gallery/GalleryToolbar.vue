<template>
  <div class="toolbar" role="search" aria-label="Filter the archive">
    <div class="toolbar__search">
      <svg class="toolbar__icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="7" cy="7" r="4.4" />
        <path d="m10.4 10.4 3.6 3.6" stroke-linecap="round" />
      </svg>
      <label class="visually-hidden" for="gallery-search">Search the archive</label>
      <input
        id="gallery-search"
        class="toolbar__input"
        type="search"
        placeholder="Search titles, series, tags…"
        :value="filters.query"
        @input="emit('update', { query: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <div class="toolbar__group">
      <label class="visually-hidden" for="gallery-anime">Filter by series</label>
      <select
        id="gallery-anime"
        class="toolbar__select"
        :value="filters.anime"
        @change="emit('update', { anime: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">All series</option>
        <option v-for="name in animes" :key="name" :value="name">{{ name }}</option>
      </select>
    </div>

    <div class="toolbar__group">
      <label class="visually-hidden" for="gallery-sort">Sort frames</label>
      <select
        id="gallery-sort"
        class="toolbar__select"
        :value="filters.sort"
        @change="emit('update', { sort: ($event.target as HTMLSelectElement).value as FrameSort })"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="title">Title A–Z</option>
        <option value="anime">By series</option>
      </select>
    </div>

    <button
      type="button"
      class="toolbar__fav-toggle"
      :class="{ 'is-active': filters.favoritesOnly }"
      :aria-pressed="filters.favoritesOnly"
      @click="emit('update', { favoritesOnly: !filters.favoritesOnly })"
    >
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">
        <path d="M8 1.8 9.9 5.6 14.1 6.2 11 9.2 11.8 13.4 8 11.4 4.2 13.4 5 9.2 1.9 6.2 6.1 5.6Z" stroke-linejoin="round" />
      </svg>
      Favorites
      <span class="toolbar__jp" aria-hidden="true">推し</span>
    </button>

    <button
      v-if="hasActiveFilters"
      type="button"
      class="toolbar__reset"
      @click="emit('reset')"
    >
      Reset
    </button>
  </div>
</template>

<script setup lang="ts">
import type { FrameSort } from '~/services/storage/types'
import type { FrameFilters } from '~/composables/useFrames'

defineProps<{
  filters: FrameFilters
  animes: string[]
  hasActiveFilters: boolean
}>()

const emit = defineEmits<{
  update: [patch: Partial<FrameFilters>]
  reset: []
}>()
</script>

<style scoped>
.toolbar {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--wall-line);
  background: rgba(17, 22, 41, 0.72);
  clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);
}

/* HUD corner brackets: neon top-left, sakura bottom-right. */
.toolbar::before,
.toolbar::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  pointer-events: none;
}

.toolbar::before {
  top: 5px;
  left: 5px;
  border-top: 2px solid var(--neon);
  border-left: 2px solid var(--neon);
}

.toolbar::after {
  bottom: 5px;
  right: 5px;
  border-bottom: 2px solid var(--sakura);
  border-right: 2px solid var(--sakura);
}

.toolbar__search {
  position: relative;
  flex: 1 1 220px;
  display: flex;
  align-items: center;
}

.toolbar__icon {
  position: absolute;
  left: var(--space-3);
  color: var(--neon);
  opacity: 0.75;
  pointer-events: none;
}

.toolbar__input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) calc(var(--space-6) + 2px);
  font-size: var(--step-2);
  color: var(--paper-100);
  background: var(--wall-950);
  border: 1px solid var(--wall-line);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  transition: border-color var(--dur-fast) var(--ease-frame),
    box-shadow var(--dur-fast) var(--ease-frame);
}

.toolbar__input::placeholder {
  color: var(--paper-200);
  opacity: 0.45;
}

.toolbar__input:hover {
  border-color: rgba(246, 241, 231, 0.3);
}

.toolbar__input:focus-visible {
  outline: none;
  border-color: var(--neon);
  box-shadow: var(--glow-neon);
}

.toolbar__group {
  display: flex;
}

.toolbar__select {
  appearance: none;
  padding: var(--space-2) var(--space-6) var(--space-2) var(--space-3);
  font-size: var(--step-2);
  color: var(--paper-100);
  background-color: var(--wall-950);
  border: 1px solid var(--wall-line);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  cursor: pointer;
  /* Custom cyan chevron so the native arrow does not fight the palette. */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2359e0ff' stroke-opacity='0.8' stroke-width='1.4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  transition: border-color var(--dur-fast) var(--ease-frame),
    box-shadow var(--dur-fast) var(--ease-frame);
}

.toolbar__select:hover {
  border-color: rgba(246, 241, 231, 0.3);
}

.toolbar__select:focus-visible {
  outline: none;
  border-color: var(--neon);
  box-shadow: var(--glow-neon);
}

.toolbar__select option {
  background: var(--wall-900);
  color: var(--paper-100);
}

.toolbar__fav-toggle,
.toolbar__reset {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--step-2);
  font-weight: 500;
  color: var(--paper-200);
  background: transparent;
  border: 1px solid var(--wall-line);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  transition: color var(--dur-fast) var(--ease-frame),
    border-color var(--dur-fast) var(--ease-frame),
    background var(--dur-fast) var(--ease-frame),
    box-shadow var(--dur-fast) var(--ease-frame);
}

.toolbar__fav-toggle:hover,
.toolbar__reset:hover {
  color: var(--paper-100);
  border-color: rgba(246, 241, 231, 0.3);
}

.toolbar__fav-toggle.is-active {
  color: var(--wall-950);
  font-weight: 700;
  background: var(--sakura);
  border-color: var(--sakura);
  box-shadow: var(--glow-sakura);
}

/* Micro Japanese caption inside the favorites chip. */
.toolbar__jp {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.15em;
  opacity: 0.7;
}

@media (max-width: 540px) {
  .toolbar__search,
  .toolbar__group,
  .toolbar__fav-toggle,
  .toolbar__select {
    flex: 1 1 100%;
  }
}
</style>
