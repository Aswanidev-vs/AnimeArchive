export interface User {
  id: string
  name: string
  avatarUrl?: string
  role: 'owner' | 'collaborator'
}

export interface Anime {
  id: string
  title: string
  altTitle?: string
  description?: string
  coverUrl: string
  screenshotCount: number
  episodeCount: number
  favourite: boolean
  updatedAt: string
  createdAt: string
}

export interface Episode {
  id: string
  animeId: string
  number: number
  title?: string
  season?: number
  screenshotCount: number
}

export interface Tag {
  id: string
  name: string
}

export interface Screenshot {
  id: string
  animeId: string
  episodeId?: string
  title?: string
  sceneTitle?: string
  characters: string[]
  tags: string[]
  notes?: string
  description?: string
  thumbUrl: string
  originalUrl: string
  favourite: boolean
  uploadedBy: string
  uploadedAt: string
  viewedAt?: string
  width?: number
  height?: number
}

export interface Collection {
  id: string
  name: string
  description?: string
  coverUrl?: string
  screenshotIds: string[]
  createdAt: string
  updatedAt: string
}

export interface StorageInfo {
  provider: string
  connected: boolean
  totalBytes: number
  usedBytes: number
  volumes: { name: string; usedBytes: number; totalBytes: number }[]
}

export interface UploadItem {
  id: string
  file: File
  previewUrl: string
  progress: number
  status: 'queued' | 'uploading' | 'done' | 'error'
  error?: string
  metadata: Record<string, any>
}

export interface SearchResult {
  type: 'screenshot' | 'anime' | 'collection' | 'tag'
  id: string
  title: string
  subtitle?: string
  thumbUrl?: string
}
