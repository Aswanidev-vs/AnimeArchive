import type { Anime, Collection, Screenshot, User, StorageInfo, Episode } from './types'

const IMG = (seed: string, w = 900, h = 1200) => `https://picsum.photos/seed/${seed}/${w}/${h}`

export const USERS: User[] = [
  { id: 'u1', name: 'Haruki', role: 'owner' },
  { id: 'u2', name: 'Miyu', role: 'collaborator' },
]

export const ANIME: Anime[] = [
  { id: 'a1', title: 'Shadows of Edo', altTitle: 'Edo no Kage', description: 'A quiet journey through rain-soaked streets and forgotten shrines.', coverUrl: IMG('edo-cover', 600, 900), screenshotCount: 8, episodeCount: 4, favourite: true, updatedAt: '2025-10-12', createdAt: '2025-08-01' },
  { id: 'a2', title: 'Neon Kowloon', altTitle: 'Kowloon no Yoru', description: 'Cyberpunk cityscapes bathed in amber and cyan.', coverUrl: IMG('kowloon-cover', 600, 900), screenshotCount: 6, episodeCount: 3, favourite: true, updatedAt: '2025-10-20', createdAt: '2025-08-15' },
  { id: 'a3', title: 'The Last Garden', altTitle: 'Saigo no Niwa', description: 'Soft light, overgrown temples, and whispered farewells.', coverUrl: IMG('garden-cover', 600, 900), screenshotCount: 5, episodeCount: 2, favourite: false, updatedAt: '2025-09-30', createdAt: '2025-09-01' },
  { id: 'a4', title: 'Glass Sky', altTitle: 'Garasu no Sora', description: 'Minimalist compositions and vast horizons.', coverUrl: IMG('glass-cover', 600, 900), screenshotCount: 4, episodeCount: 2, favourite: false, updatedAt: '2025-10-05', createdAt: '2025-09-10' },
  { id: 'a5', title: 'Iron Season', altTitle: 'Tetsu no Kisetsu', description: 'Heavy industrial textures and kinetic action.', coverUrl: IMG('iron-cover', 600, 900), screenshotCount: 4, episodeCount: 3, favourite: false, updatedAt: '2025-10-18', createdAt: '2025-09-20' },
  { id: 'a6', title: 'Paper Moon', altTitle: 'Kami no Tsuki', description: 'Delicate, hand-drawn warmth and quiet nights.', coverUrl: IMG('paper-cover', 600, 900), screenshotCount: 3, episodeCount: 2, favourite: true, updatedAt: '2025-10-22', createdAt: '2025-10-01' },
]

const makeShot = (i: number, animeId: string, seed: string, overrides: Partial<Screenshot> = {}): Screenshot => ({
  id: `s${i}`,
  animeId,
  episodeId: `e${animeId}-${(i % 3) + 1}`,
  title: overrides.title ?? `Moment ${i}`,
  sceneTitle: overrides.sceneTitle,
  characters: overrides.characters ?? [],
  tags: overrides.tags ?? [],
  notes: overrides.notes,
  description: overrides.description,
  thumbUrl: IMG(seed, 600, 800),
  originalUrl: IMG(seed, 1800, 2400),
  favourite: overrides.favourite ?? false,
  uploadedBy: overrides.uploadedBy ?? (i % 2 === 0 ? 'u1' : 'u2'),
  uploadedAt: new Date(2025, 8 + (i % 3), (i % 27) + 1).toISOString(),
  width: 1800,
  height: 2400,
  ...overrides,
})

export const SCREENSHOTS: Screenshot[] = [
  makeShot(1, 'a1', 'edo-1', { title: 'Rain on Stone', sceneTitle: 'Opening', characters: ['Ren'], tags: ['rain', 'night'], favourite: true, notes: 'The first frame that made me start this archive.' }),
  makeShot(2, 'a1', 'edo-2', { title: 'Shrine Lantern', characters: ['Ren', 'Yuki'], tags: ['shrine', 'warm light'], favourite: false }),
  makeShot(3, 'a1', 'edo-3', { title: 'Empty Alley', tags: ['alley', 'minimal'], favourite: true }),
  makeShot(4, 'a1', 'edo-4', { title: 'Bridge at Dusk', characters: ['Yuki'], tags: ['bridge', 'dusk'] }),
  makeShot(5, 'a2', 'kow-1', { title: 'Neon Alley', sceneTitle: 'Chase', characters: ['Kai'], tags: ['neon', 'cyberpunk'], favourite: true }),
  makeShot(6, 'a2', 'kow-2', { title: 'Rooftop Signal', characters: ['Kai', 'Mira'], tags: ['rooftop', 'night'] }),
  makeShot(7, 'a2', 'kow-3', { title: 'Market Crowd', tags: ['market', 'crowd'] }),
  makeShot(8, 'a2', 'kow-4', { title: 'Subway Glow', tags: ['subway', 'glow'], favourite: true }),
  makeShot(9, 'a3', 'gar-1', { title: 'Overgrown Gate', characters: ['Hana'], tags: ['garden', 'nature'], favourite: true }),
  makeShot(10, 'a3', 'gar-2', { title: 'Tea Room', characters: ['Hana', 'Sensei'], tags: ['interior', 'warm'] }),
  makeShot(11, 'a3', 'gar-3', { title: 'Petal Fall', tags: ['petals', 'soft'] }),
  makeShot(12, 'a4', 'gla-1', { title: 'Horizon Line', tags: ['sky', 'minimal'], favourite: true }),
  makeShot(13, 'a4', 'gla-2', { title: 'Glass Facade', tags: ['architecture'] }),
  makeShot(14, 'a5', 'iro-1', { title: 'Forge Heat', characters: ['Tetsu'], tags: ['action', 'fire'], favourite: true }),
  makeShot(15, 'a5', 'iro-2', { title: 'Steel Corridor', tags: ['industrial'] }),
  makeShot(16, 'a6', 'pap-1', { title: 'Paper Lantern', characters: ['Sora'], tags: ['night', 'lantern'], favourite: true }),
  makeShot(17, 'a6', 'pap-2', { title: 'Quiet Window', tags: ['window', 'soft'] }),
]

export const EPISODES: Episode[] = ANIME.flatMap((a) =>
  Array.from({ length: a.episodeCount }, (_, i) => ({
    id: `e${a.id}-${i + 1}`,
    animeId: a.id,
    number: i + 1,
    title: `Episode ${i + 1}`,
    season: 1,
    screenshotCount: SCREENSHOTS.filter((s) => s.animeId === a.id && s.episodeId === `e${a.id}-${i + 1}`).length,
  }))
)

export const COLLECTIONS: Collection[] = [
  { id: 'c1', name: 'Favourite Cinematic Frames', description: 'The frames we keep coming back to.', coverUrl: IMG('col-1', 800, 600), screenshotIds: ['s1', 's5', 's9', 's12', 's16'], createdAt: '2025-09-01', updatedAt: '2025-10-20' },
  { id: 'c2', name: 'Beautiful Background Art', description: 'Environments that breathe.', coverUrl: IMG('col-2', 800, 600), screenshotIds: ['s3', 's7', 's11', 's13'], createdAt: '2025-09-10', updatedAt: '2025-10-15' },
  { id: 'c3', name: 'Emotional Moments', description: 'Quiet, heavy, human.', coverUrl: IMG('col-3', 800, 600), screenshotIds: ['s2', 's10', 's17'], createdAt: '2025-09-20', updatedAt: '2025-10-18' },
  { id: 'c4', name: 'Best Fight Scenes', description: 'Motion frozen in a single frame.', coverUrl: IMG('col-4', 800, 600), screenshotIds: ['s14', 's15'], createdAt: '2025-10-01', updatedAt: '2025-10-22' },
]

export const STORAGE_INFO: StorageInfo = {
  provider: 'Abstract Media Storage',
  connected: true,
  totalBytes: 50 * 1024 * 1024 * 1024,
  usedBytes: 3.4 * 1024 * 1024 * 1024,
  volumes: [
    { name: 'Primary Volume', usedBytes: 2.1 * 1024 * 1024 * 1024, totalBytes: 30 * 1024 * 1024 * 1024 },
    { name: 'Archive Volume', usedBytes: 1.3 * 1024 * 1024 * 1024, totalBytes: 20 * 1024 * 1024 * 1024 },
  ],
}
