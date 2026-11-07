<template>
  <div class="app-shell" :class="{ 'is-collapsed': collapsed }">
    <AppSidebar class="app-shell__sidebar" />
    <div class="app-shell__main">
      <AppHeaderMobile />
      <AppHeader />
      <main class="app-shell__content">
        <slot />
      </main>
    </div>
    <MobileNav />
    <SearchCommand />
  </div>
</template>

<script setup lang="ts">
const { collapsed, init } = useSidebar()
onMounted(init)
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}
.app-shell.is-collapsed { grid-template-columns: 64px 1fr; }
.app-shell__sidebar { display: none; }
.app-shell__content { padding: 24px; max-width: 1400px; margin: 0 auto; width: 100%; }
@media (min-width: 768px) {
  .app-shell__sidebar { display: block; }
}
@media (max-width: 767px) {
  .app-shell { grid-template-columns: 1fr; }
  .app-shell__content { padding: 16px; padding-bottom: 80px; }
}
</style>
