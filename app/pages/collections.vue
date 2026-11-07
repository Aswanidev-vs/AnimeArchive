<template>
  <div class="collections">
    <div class="page-head">
      <h1 class="page-title">Collections</h1>
      <button class="btn btn--primary" @click="showCreate = true">New collection</button>
    </div>
    <div class="col-grid">
      <div v-for="c in collections" :key="c.id" class="col-wrap">
        <CollectionCard :collection="c" />
        <div class="col-wrap__actions">
          <button class="btn" @click="startEdit(c)">Edit</button>
          <button class="btn btn--danger" @click="remove(c.id)">Delete</button>
        </div>
      </div>
    </div>
    <div v-if="editing" class="modal-backdrop" @click.self="editing = null">
      <div class="modal">
        <h3>Edit collection</h3>
        <input v-model="editName" class="input" placeholder="Collection name" />
        <textarea v-model="editDesc" class="input" placeholder="Description" rows="3" />
        <div class="modal__actions">
          <button class="btn" @click="editing = null">Cancel</button>
          <button class="btn btn--primary" @click="saveEdit">Save</button>
        </div>
      </div>
    </div>
    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
      <div class="modal">
        <h3>New collection</h3>
        <input v-model="newName" class="input" placeholder="Collection name" />
        <textarea v-model="newDesc" class="input" placeholder="Description" rows="3" />
        <div class="modal__actions">
          <button class="btn" @click="showCreate = false">Cancel</button>
          <button class="btn btn--primary" @click="create">Create</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '~/services/api/client'
import type { Collection } from '~/services/api/types'
const collections = ref<Collection[]>([])
const showCreate = ref(false)
const newName = ref('')
const newDesc = ref('')
const editing = ref<string | null>(null)
const editName = ref('')
const editDesc = ref('')
const create = async () => {
  if (!newName.value.trim()) return
  await api.createCollection({ name: newName.value, description: newDesc.value })
  collections.value = await api.listCollections()
  newName.value = ''; newDesc.value = ''; showCreate.value = false
}
const startEdit = (c: Collection) => { editing.value = c.id; editName.value = c.name; editDesc.value = c.description ?? '' }
const saveEdit = async () => {
  if (!editing.value) return
  await api.updateCollection(editing.value, { name: editName.value, description: editDesc.value })
  collections.value = await api.listCollections()
  editing.value = null
}
const remove = async (id: string) => {
  await api.deleteCollection(id)
  collections.value = await api.listCollections()
}
onMounted(async () => { collections.value = await api.listCollections() })
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-family: 'Newsreader', serif; font-size: 32px; margin: 0; }
.col-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.col-wrap { display: flex; flex-direction: column; gap: 8px; }
.col-wrap__actions { display: flex; gap: 6px; }
.btn--danger { background: transparent; border-color: var(--border); color: var(--text-muted); }
.btn { padding: 8px 14px; border-radius: 12px; background: var(--surface-elevated); border: 1px solid var(--border); color: var(--text); cursor: pointer; font-size: 13px; }
.btn--primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 40; display: grid; place-items: center; }
.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 24px; width: 90%; max-width: 420px; display: flex; flex-direction: column; gap: 12px; }
.modal h3 { font-family: 'Newsreader', serif; margin: 0; }
.input { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 12px; font-size: 13px; font-family: inherit; }
.modal__actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
