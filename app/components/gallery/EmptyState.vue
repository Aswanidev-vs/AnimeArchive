<template>
  <div class="empty">
    <div class="empty__mark">∅</div>
    <h3 class="empty__title">{{ title }}</h3>
    <p class="empty__desc">{{ description }}</p>
    <slot />
  </div>
</template>
<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>
<style scoped>
.empty { text-align: center; padding: 60px 20px; color: var(--text-secondary); }
.empty__mark { font-family: 'Newsreader', serif; font-size: 48px; color: var(--text-muted); margin-bottom: 12px; }
.empty__title { font-family: 'Newsreader', serif; font-size: 20px; color: var(--text); margin: 0 0 6px; }
.empty__desc { font-size: 13px; margin: 0; }
</style>
