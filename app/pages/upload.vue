<template>
  <div class="upload">
    <h1 class="page-title">Upload</h1>
    <p class="page-sub">Add screenshots to your archive. Drag files or click to browse.</p>

    <div class="dropzone" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop" :class="{ 'is-dragging': dragging }" @click="pick">
      <input ref="fileInput" type="file" multiple accept="image/*" hidden @change="onPick" />
      <Upload :size="32" />
      <p>Drop images here or click to browse</p>
      <span class="dropzone__hint">JPEG, PNG, WebP · up to 25 MB</span>
    </div>

    <div v-if="queue.length" class="queue">
      <div v-for="item in queue" :key="item.id" class="queue__item">
        <img :src="item.previewUrl" class="queue__thumb" />
        <div class="queue__info">
          <div class="queue__name">{{ item.file.name }}</div>
          <div class="queue__size">{{ (item.file.size / 1024 / 1024).toFixed(2) }} MB</div>
          <div class="queue__bar"><div class="queue__fill" :style="{ width: item.progress + '%' }" :class="item.status" /></div>
          <div class="queue__status">{{ item.status }}</div>
        </div>
        <div class="queue__meta">
          <select v-model="item.metadata.animeId" class="input">
            <option v-for="a in animeList" :key="a.id" :value="a.id">{{ a.title }}</option>
          </select>
          <input v-model.number="item.metadata.episodeNumber" type="number" class="input" placeholder="Episode #" />
          <input v-model="item.metadata.tags" class="input" placeholder="tags (comma)" />
        </div>
        <button class="btn btn--danger" @click="remove(item.id)" v-if="item.status !== 'uploading'">Remove</button>
      </div>
    </div>

    <div v-if="queue.length" class="upload__actions">
      <button class="btn" @click="clearAll" :disabled="uploading">Clear</button>
      <button class="btn btn--primary" @click="startUpload" :disabled="uploading || !queue.length">
        {{ uploading ? 'Uploading...' : `Upload ${queue.length} file(s)` }}
      </button>
    </div>

    <div v-if="successCount" class="success-banner">
      Successfully uploaded {{ successCount }} screenshot(s).
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Upload } from '@lucide/vue'
import { api } from '~/services/api/client'
import type { UploadItem } from '~/services/api/types'
import type { Anime } from '~/services/api/types'

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const queue = ref<UploadItem[]>([])
const animeList = ref<Anime[]>([])
const uploading = ref(false)
const successCount = ref(0)

const pick = () => fileInput.value?.click()
const onPick = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (files) addFiles(Array.from(files))
}
const onDrop = (e: DragEvent) => {
  dragging.value = false
  const files = e.dataTransfer?.files
  if (files) addFiles(Array.from(files))
}

const addFiles = (files: File[]) => {
  for (const f of files) {
    const previewUrl = URL.createObjectURL(f)
    queue.value.push({
      id: `q${Date.now()}-${Math.random()}`,
      file: f,
      previewUrl,
      progress: 0,
      status: 'queued',
      metadata: { animeId: animeList.value[0]?.id, episodeNumber: 1, tags: [] as any },
    })
  }
}

const remove = (id: string) => {
  queue.value = queue.value.filter((q) => q.id !== id)
}

const clearAll = () => { queue.value = [] }

const startUpload = async () => {
  uploading.value = true
  successCount.value = 0
  for (const item of queue.value) {
    if (item.status !== 'queued') continue
    item.status = 'uploading'
    // simulate progress
    await new Promise<void>((resolve) => {
      let p = 0
      const t = setInterval(() => {
        p += 12
        item.progress = Math.min(95, p)
        if (p >= 95) { clearInterval(t); resolve() }
      }, 120)
    })
    try {
      // normalize tags
      const meta: any = { ...item.metadata }
      if (typeof meta.tags === 'string') meta.tags = (meta.tags as string).split(',').map((s: string) => s.trim()).filter(Boolean)
      item.metadata = meta
      await api.upload(item)
      item.progress = 100
      item.status = 'done'
      successCount.value++
    } catch (e) {
      item.status = 'error'
      item.error = 'Upload failed'
    }
  }
  uploading.value = false
  // clear done after short delay
  setTimeout(() => { queue.value = queue.value.filter((q) => q.status !== 'done') }, 1500)
}

onMounted(async () => {
  animeList.value = await api.listAnime()
})
</script>

<style scoped>
.upload { display: flex; flex-direction: column; gap: 20px; }
.page-title { font-family: 'Newsreader', serif; font-size: 32px; margin: 0; }
.page-sub { color: var(--text-secondary); margin: 4px 0 0; font-size: 13px; }
.dropzone { border: 2px dashed var(--border); border-radius: 8px; padding: 48px; text-align: center; cursor: pointer; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 8px; transition: border-color 0.15s, background 0.15s; }
.dropzone.is-dragging { border-color: var(--accent); background: var(--surface); }
.dropzone__hint { font-size: 11px; color: var(--text-muted); }
.queue { display: flex; flex-direction: column; gap: 12px; }
.queue__item { display: grid; grid-template-columns: 80px 1fr 260px auto; gap: 12px; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 12px; }
.queue__thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 4px; }
.queue__name { font-size: 13px; font-weight: 500; }
.queue__size { font-size: 11px; color: var(--text-muted); }
.queue__bar { height: 4px; background: var(--bg); border-radius: 2px; margin-top: 6px; overflow: hidden; }
.queue__fill { height: 100%; background: var(--accent); transition: width 0.1s; }
.queue__fill.done { background: #7a9a6e; }
.queue__fill.error { background: #b05a4a; }
.queue__status { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-top: 4px; }
.queue__meta { display: flex; flex-direction: column; gap: 6px; }
.input { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 6px 8px; border-radius: 4px; font-size: 12px; }
.upload__actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn { padding: 8px 14px; border-radius: 4px; background: var(--surface-elevated); border: 1px solid var(--border); color: var(--text); cursor: pointer; font-size: 13px; }
.btn--primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.btn--danger { background: transparent; border-color: var(--border); color: var(--text-muted); }
.success-banner { padding: 12px 16px; background: var(--surface); border: 1px solid #7a9a6e; border-radius: 4px; color: #7a9a6e; font-size: 13px; }
@media (max-width: 767px) {
  .queue__item { grid-template-columns: 60px 1fr; }
  .queue__meta { grid-column: 1 / -1; }
}
</style>
