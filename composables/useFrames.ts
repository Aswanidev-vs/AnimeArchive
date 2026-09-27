/**
 * useFrames - the single gallery state module.
 *
 * Owns the frame list (adapter-backed), the current filter/sort controls and
 * the derived "exhibition" the grid renders. Gallery components know nothing
 * about localStorage; they talk to this composable, and this composable talks
 * only to the `FrameStorageAdapter` contract.
 */
import { computed, ref } from 'vue'
import localAdapter from '../services/storage/localAdapter'
import type { Frame, FrameStorageAdapter, FrameSort } from '../services/storage/types'

export interface FrameFilters {
  query: string
  anime: string
  favoritesOnly: boolean
  sort: FrameSort
}

const defaultFilters: FrameFilters = {
  query: '',
  anime: '',
  favoritesOnly: false,
  sort: 'newest',
}

export function useFrames(adapter: FrameStorageAdapter = localAdapter) {
  const frames = ref<Frame[]>([])
  const isLoading = ref(true)
  const loadError = ref('')
  const filters = ref<FrameFilters>({ ...defaultFilters })

  async function load(): Promise<void> {
    isLoading.value = true
    loadError.value = ''
    try {
      frames.value = await adapter.list()
    } catch (cause) {
      loadError.value = cause instanceof Error ? cause.message : 'The archive could not be read.'
    } finally {
      isLoading.value = false
    }
  }

  async function toggleFavorite(id: string): Promise<void> {
    const current = frames.value.find((frame) => frame.id === id)
    if (!current || !adapter.capabilities?.update) {
      return
    }
    try {
      const updated = await adapter.update(id, { favorite: !current.favorite })
      frames.value = frames.value.map((frame) => (frame.id === id ? updated : frame))
    } catch (cause) {
      loadError.value = cause instanceof Error ? cause.message : 'The favorite state could not be saved.'
    }
  }

  async function addFrame(frame: Frame): Promise<void> {
    // A fresh upload is prepended; the adapter already persisted it.
    frames.value = [frame, ...frames.value.filter((existing) => existing.id !== frame.id)]
    await Promise.resolve()
  }

  const allAnime = computed<string[]>(() =>
    [...new Set(frames.value.map((frame) => frame.anime).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    ),
  )

  const filteredFrames = computed<Frame[]>(() => {
    const { query, anime, favoritesOnly, sort } = filters.value
    const needle = query.trim().toLowerCase()

    let result = frames.value.filter((frame) => {
      if (favoritesOnly && !frame.favorite) return false
      if (anime && frame.anime !== anime) return false
      if (!needle) return true
      const haystack = [frame.title, frame.anime, frame.episode, frame.note, ...frame.tags]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })

    const byNewest = (a: Frame, b: Frame): number =>
      (b.createdAt ?? b.capturedAt ?? '').localeCompare(a.createdAt ?? a.capturedAt ?? '')
    const byOldest = (a: Frame, b: Frame): number => byNewest(b, a)

    if (sort === 'newest') result = [...result].sort(byNewest)
    else if (sort === 'oldest') result = [...result].sort(byOldest)
    else if (sort === 'title') result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'anime')
      result = [...result].sort((a, b) => a.anime.localeCompare(b.anime) || byNewest(a, b))

    return result
  })

  const hasActiveFilters = computed<boolean>(
    () =>
      filters.value.query.trim() !== '' ||
      filters.value.anime !== '' ||
      filters.value.favoritesOnly ||
      filters.value.sort !== defaultFilters.sort,
  )

  function resetFilters(): void {
    filters.value = { ...defaultFilters }
  }

  return {
    frames,
    isLoading,
    loadError,
    filters,
    allAnime,
    filteredFrames,
    hasActiveFilters,
    load,
    toggleFavorite,
    addFrame,
    resetFilters,
  }
}

export default useFrames
