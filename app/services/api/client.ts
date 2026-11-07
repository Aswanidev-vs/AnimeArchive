import type { Anime, Collection, Episode, Screenshot, SearchResult, StorageInfo, UploadItem } from './types'
import { ANIME, COLLECTIONS, EPISODES, SCREENSHOTS, STORAGE_INFO } from './mockData'

// In-memory mutable store for mock interactions
let screenshots = [...SCREENSHOTS]
let collections = [...COLLECTIONS]
let anime = [...ANIME]

export interface ApiClient {
  listScreenshots(filters?: { animeId?: string; episodeId?: string; favourite?: boolean; tag?: string; collectionId?: string }): Promise<Screenshot[]>
  getScreenshot(id: string): Promise<Screenshot | null>
  updateScreenshot(id: string, patch: Partial<Screenshot>): Promise<Screenshot | null>
  deleteScreenshot(id: string): Promise<void>
  toggleFavourite(id: string): Promise<Screenshot | null>
  upload(item: UploadItem): Promise<Screenshot>
  listAnime(): Promise<Anime[]>
  getAnime(id: string): Promise<Anime | null>
  listEpisodes(animeId: string): Promise<Episode[]>
  listCollections(): Promise<Collection[]>
  getCollection(id: string): Promise<Collection | null>
  createCollection(data: Omit<Collection, 'id' | 'createdAt' | 'updatedAt' | 'screenshotIds'>): Promise<Collection>
  updateCollection(id: string, patch: Partial<Collection>): Promise<Collection | null>
  deleteCollection(id: string): Promise<void>
  addToCollection(collectionId: string, screenshotId: string): Promise<void>
  removeFromCollection(collectionId: string, screenshotId: string): Promise<void>
  search(query: string): Promise<SearchResult[]>
  getStorageInfo(): Promise<StorageInfo>
}

export const api: ApiClient = {
  async listScreenshots(filters = {}) {
    let res = [...screenshots]
    if (filters.animeId) res = res.filter((s) => s.animeId === filters.animeId)
    if (filters.episodeId) res = res.filter((s) => s.episodeId === filters.episodeId)
    if (filters.favourite) res = res.filter((s) => s.favourite)
    if (filters.tag) res = res.filter((s) => s.tags.includes(filters.tag!))
    if (filters.collectionId) {
      const c = collections.find((x) => x.id === filters.collectionId)
      if (c) res = res.filter((s) => c.screenshotIds.includes(s.id))
    }
    return res
  },
  async getScreenshot(id) {
    return screenshots.find((s) => s.id === id) ?? null
  },
  async updateScreenshot(id, patch) {
    const idx = screenshots.findIndex((s) => s.id === id)
    if (idx < 0) return null
    const cur = screenshots[idx]!
    screenshots[idx] = { ...cur, ...patch }
    return screenshots[idx]!
  },
  async deleteScreenshot(id) {
    screenshots = screenshots.filter((s) => s.id !== id)
    collections = collections.map((c) => ({ ...c, screenshotIds: c.screenshotIds.filter((x) => x !== id) }))
  },
  async toggleFavourite(id) {
    const s = screenshots.find((x) => x.id === id)
    if (!s) return null
    s.favourite = !s.favourite
    return { ...s }
  },
  async upload(item) {
    const newShot: Screenshot = {
      id: `s${Date.now()}`,
      animeId: (item.metadata.animeId as string) || anime[0]!.id,
      episodeId: item.metadata.episodeId as string | undefined,
      title: item.metadata.title as string | undefined,
      sceneTitle: item.metadata.sceneTitle as string | undefined,
      characters: (item.metadata.characters as string[]) ?? [],
      tags: (item.metadata.tags as string[]) ?? [],
      notes: item.metadata.notes as string | undefined,
      description: item.metadata.description as string | undefined,
      thumbUrl: item.previewUrl,
      originalUrl: item.previewUrl,
      favourite: false,
      uploadedBy: 'u1',
      uploadedAt: new Date().toISOString(),
      width: 1200,
      height: 1600,
    }
    screenshots = [newShot, ...screenshots]
    return newShot
  },
  async listAnime() { return [...anime] },
  async getAnime(id) { return anime.find((a) => a.id === id) ?? null },
  async listEpisodes(animeId) { return EPISODES.filter((e) => e.animeId === animeId) },
  async listCollections() { return [...collections] },
  async getCollection(id) { return collections.find((c) => c.id === id) ?? null },
  async createCollection(data) {
    const c: Collection = { ...data, id: `c${Date.now()}`, screenshotIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    collections = [c, ...collections]
    return c
  },
  async updateCollection(id, patch) {
    const idx = collections.findIndex((c) => c.id === id)
    if (idx < 0) return null
    const cur = collections[idx]!
    collections[idx] = { ...cur, ...patch, updatedAt: new Date().toISOString() }
    return collections[idx]!
  },
  async deleteCollection(id) {
    collections = collections.filter((c) => c.id !== id)
  },
  async addToCollection(collectionId, screenshotId) {
    const c = collections.find((x) => x.id === collectionId)
    if (c && !c.screenshotIds.includes(screenshotId)) c.screenshotIds.push(screenshotId)
  },
  async removeFromCollection(collectionId, screenshotId) {
    const c = collections.find((x) => x.id === collectionId)
    if (c) c.screenshotIds = c.screenshotIds.filter((x) => x !== screenshotId)
  },
  async search(query) {
    const q = query.toLowerCase()
    const res: SearchResult[] = []
    for (const s of screenshots) {
      if (s.title?.toLowerCase().includes(q) || s.sceneTitle?.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q)) || s.characters.some((c) => c.toLowerCase().includes(q))) {
        res.push({ type: 'screenshot', id: s.id, title: s.title ?? 'Untitled', subtitle: s.sceneTitle, thumbUrl: s.thumbUrl })
      }
    }
    for (const a of anime) {
      if (a.title.toLowerCase().includes(q) || a.altTitle?.toLowerCase().includes(q)) {
        res.push({ type: 'anime', id: a.id, title: a.title, subtitle: a.altTitle, thumbUrl: a.coverUrl })
      }
    }
    for (const c of collections) {
      if (c.name.toLowerCase().includes(q)) {
        res.push({ type: 'collection', id: c.id, title: c.name, subtitle: c.description })
      }
    }
    return res.slice(0, 20)
  },
  async getStorageInfo() { return STORAGE_INFO },
}
