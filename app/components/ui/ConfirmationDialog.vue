<template>
  <Teleport to="body">
    <div v-if="open" class="cd-backdrop" @click.self="emit('cancel')">
      <div class="cd-panel">
        <h3 class="cd-title">{{ title }}</h3>
        <p class="cd-desc">{{ description }}</p>
        <div class="cd-actions">
          <button class="btn" @click="emit('cancel')">Cancel</button>
          <button class="btn btn--danger" @click="emit('confirm')">Confirm</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
defineProps<{ open: boolean; title: string; description?: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>
<style scoped>
.cd-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 60; display: grid; place-items: center; }
.cd-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 24px; width: 90%; max-width: 400px; }
.cd-title { font-family: 'Newsreader', serif; font-size: 18px; margin: 0 0 8px; }
.cd-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; }
.cd-actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn { padding: 8px 14px; border-radius: 4px; background: var(--surface-elevated); border: 1px solid var(--border); color: var(--text); cursor: pointer; font-size: 13px; }
.btn--danger { background: var(--accent); color: var(--bg); border-color: var(--accent); }
</style>
