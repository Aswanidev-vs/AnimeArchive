<template>
  <div class="skeleton" :style="{ aspectRatio }" />
</template>
<script setup lang="ts">
defineProps<{ aspectRatio?: string }>()
</script>
<style scoped>
.skeleton { border-radius: 4px; background: linear-gradient(90deg, var(--elevated) 0%, var(--surface) 50%, var(--elevated) 100%); background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
