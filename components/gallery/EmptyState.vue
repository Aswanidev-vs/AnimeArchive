<template>
  <section class="empty" aria-live="polite">
    <!-- Screentone fill; decorative. -->
    <span class="empty__tone" aria-hidden="true"></span>
    <p class="empty__mark" aria-hidden="true">空</p>
    <h2 class="empty__title">{{ title }}</h2>
    <p class="empty__message">{{ message }}</p>
    <div v-if="$slots.default" class="empty__actions">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  message: string
}>()
</script>

<style scoped>
/*
 * A manga panel dropped into the night: warm paper stock, hard ink border,
 * offset sakura drop-shadow, screentone dots fading from the top corner.
 * filter:drop-shadow (rather than box-shadow) so the shadow survives the
 * clip-path cut.
 */
.empty {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-7);
  overflow: hidden;
  background: var(--paper-100);
  border: 2px solid var(--ink-900);
  clip-path: polygon(0 0, calc(100% - var(--cut-lg)) 0, 100% var(--cut-lg), 100% 100%, 0 100%);
  filter: drop-shadow(7px 7px 0 rgba(255, 93, 143, 0.85));
}

.empty__tone {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(11, 14, 26, 0.12) 1.2px, transparent 1.4px);
  background-size: 10px 10px;
  -webkit-mask-image: linear-gradient(215deg, #000, transparent 55%);
  mask-image: linear-gradient(215deg, #000, transparent 55%);
}

.empty__mark {
  position: relative;
  font-family: var(--font-display);
  font-size: clamp(48px, 8vw, 72px);
  font-weight: 800;
  line-height: 1;
  color: var(--sakura);
  text-shadow: 3px 3px 0 rgba(11, 14, 26, 0.9);
}

.empty__title {
  position: relative;
  font-size: var(--step-5);
  color: var(--ink-900);
}

.empty__message {
  position: relative;
  max-width: 46ch;
  font-size: var(--step-3);
  color: rgba(11, 14, 26, 0.75);
}

.empty__actions {
  position: relative;
  margin-top: var(--space-2);
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
</style>
