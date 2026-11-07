<template>
  <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
    <button class="sidebar__collapse" @click="toggle" aria-label="Toggle sidebar">
      <PanelLeft :size="16" />
    </button>
    <div class="sidebar__brand">
      <img src="/logo.png" alt="AnimeArchive" class="sidebar__mark" />
      <div v-if="!collapsed" class="sidebar__brand-text">
        <div class="sidebar__name">AnimeArchive</div>
        <div class="sidebar__tag">private archive</div>
      </div>
    </div>

    <nav class="sidebar__nav">
      <NuxtLink v-for="item in nav" :key="item.to" :to="item.to" class="sidebar__link" :class="{ 'is-active': isActive(item.to) }">
        <component :is="item.icon" :size="18" />
        <span v-if="!collapsed">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div v-if="!collapsed" class="sidebar__library">
      <div class="sidebar__section-label">Library</div>
      <NuxtLink v-for="c in collections" :key="c.id" :to="`/collections`" class="sidebar__sub">
        <FolderKanban :size="15" />
        <span>{{ c.name }}</span>
      </NuxtLink>
      <NuxtLink v-for="a in recentAnime" :key="a.id" :to="`/anime/${a.id}`" class="sidebar__sub">
        <Library :size="15" />
        <span>{{ a.title }}</span>
      </NuxtLink>
    </div>

    <div class="sidebar__foot">
      <div v-if="!collapsed" class="sidebar__storage">
        <div class="sidebar__section-label">Storage</div>
        <div class="storage-bar"><div class="storage-bar__fill" style="width: 34%" /></div>
        <div class="storage-bar__meta">3.4 / 50 GB</div>
      </div>
      <div class="sidebar__profile">
        <div class="avatar">H</div>
        <div class="avatar">M</div>
        <NuxtLink to="/settings" class="sidebar__settings"><Settings :size="16" /></NuxtLink>
      </div>
      <NuxtLink to="/upload" class="btn btn--primary sidebar__upload">{{ collapsed ? '+' : 'Upload moments' }}</NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Home, Images, Library, FolderKanban, Heart, Clock, Upload, Settings, PanelLeft } from '@lucide/vue'
import { api } from '~/services/api/client'
import type { Anime, Collection } from '~/services/api/types'
import { useSidebar } from '~/composables/useSidebar'

const route = useRoute()
const { collapsed, toggle } = useSidebar()
const collections = ref<Collection[]>([])
const recentAnime = ref<Anime[]>([])

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/gallery', label: 'Gallery', icon: Images },
  { to: '/anime', label: 'Anime Library', icon: Library },
  { to: '/collections', label: 'Collections', icon: FolderKanban },
  { to: '/favourites', label: 'Favourites', icon: Heart },
  { to: '/recent', label: 'Recently Added', icon: Clock },
]

const isActive = (to: string) => route.path === to || route.path.startsWith(to + '/')

onMounted(async () => {
  const [cols, anime] = await Promise.all([api.listCollections(), api.listAnime()])
  collections.value = cols.slice(0, 4)
  recentAnime.value = anime.slice(0, 3)
})
</script>

<style scoped>
.sidebar { padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; border-right: 1px solid var(--border); background: var(--surface); height: 100vh; position: sticky; top: 0; overflow-y: auto; }
.sidebar.is-collapsed { padding: 16px 8px; align-items: center; gap: 12px; }
.sidebar.is-collapsed .sidebar__brand-text { display: none; }
.sidebar__collapse { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 8px; align-self: flex-end; }
.sidebar__collapse:hover { background: var(--bg); color: var(--text); }
.sidebar__brand { display: flex; align-items: center; gap: 12px; padding: 4px 4px 8px; }
.sidebar__mark { width: 36px; height: 36px; object-fit: contain; border-radius: 8px; }
.sidebar__name { font-family: 'Newsreader', serif; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.sidebar__tag { font-size: 10px; color: var(--text-muted); letter-spacing: 0.14em; text-transform: uppercase; margin-top: 2px; }
.sidebar__nav { display: flex; flex-direction: column; gap: 4px; }
.sidebar__link { display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 12px; border-radius: 12px; font-size: 13px; color: var(--text-2); transition: background-color 0.15s ease, color 0.15s ease; }
.sidebar__link:hover { background: var(--bg); color: var(--text); }
.sidebar__link.is-active { background: var(--elevated); color: var(--text); position: relative; font-weight: 500; }
.sidebar__link.is-active::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 2px; background: var(--accent); }
.sidebar__library { display: flex; flex-direction: column; gap: 2px; border-top: 1px solid var(--border); padding-top: 14px; }
.sidebar__section-label { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; padding: 0 6px; }
.sidebar__sub { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 10px; font-size: 12px; color: var(--text-2); transition: background-color 0.15s, color 0.15s; }
.sidebar__sub:hover { background: var(--bg); color: var(--text); }
.sidebar__foot { margin-top: auto; display: flex; flex-direction: column; gap: 14px; border-top: 1px solid var(--border); padding-top: 14px; }
.sidebar__storage { display: flex; flex-direction: column; gap: 6px; }
.storage-bar { height: 6px; background: var(--bg); border-radius: var(--radius-pill); overflow: hidden; }
.storage-bar__fill { height: 100%; background: var(--accent); border-radius: var(--radius-pill); }
.storage-bar__meta { font-size: 11px; color: var(--text-muted); }
.sidebar__profile { display: flex; align-items: center; gap: 8px; }
.avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--bg); border: 1px solid var(--border); display: grid; place-items: center; font-size: 12px; color: var(--text-2); font-weight: 500; }
.sidebar__settings { margin-left: auto; color: var(--text-muted); padding: 4px; border-radius: 8px; }
.sidebar__settings:hover { background: var(--bg); color: var(--text); }
.sidebar__upload { text-align: center; border-radius: var(--radius-pill); padding: 10px 16px; font-size: 13px; font-weight: 500; }
.btn { display: inline-block; padding: 8px 14px; border-radius: var(--radius-pill); font-size: 12px; cursor: pointer; border: 1px solid var(--border); background: var(--elevated); color: var(--text); }
.btn--primary { background: var(--accent); color: #f1efe8; border-color: var(--accent); }
</style>
