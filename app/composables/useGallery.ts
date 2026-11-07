import { ref, computed } from 'vue'
import { api } from '~/services/api/client'
import type { Screenshot } from '~/services/api/types'

export type ViewMode = 'masonry' | 'grid' | 'compact'

export function useGallery() {
  const items = ref<Screenshot[]>([])
  const loading = ref(false)
  const viewMode = ref<ViewMode>('masonry')
  const selected = ref<Set<string>>(new Set())
  const filters = ref<{ animeId?: string; tag?: string; favourite?: boolean; collectionId?: string }>({})

  const load = async () => {
    loading.value = true
    items.value = await api.listScreenshots(filters.value)
    loading.value = false
  }

  const toggleSelect = (id: string) => {
    if (selected.value.has(id)) selected.value.delete(id)
    else selected.value.add(id)
    selected.value = new Set(selected.value)
  }

  const clearSelection = () => { selected.value = new Set() }

  const toggleFavourite = async (id: string) => {
    const updated = await api.toggleFavourite(id)
    if (updated) {
      const idx = items.value.findIndex((s) => s.id === id)
      if (idx >= 0) items.value[idx] = updated
    }
  }

  return { items, loading, viewMode, selected, filters, load, toggleSelect, clearSelection, toggleFavourite }
}
