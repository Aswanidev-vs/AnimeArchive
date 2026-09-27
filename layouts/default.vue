<template>
  <div class="shell grain">
    <a href="#main" class="shell__skip">Skip to gallery</a>

    <!-- Night-sky atmosphere: glows, stars, halftone horizon. Decorative only
         (aria-hidden, pointer-events:none); sits behind the content via a
         negative z-index so no content ancestor creates a stacking context
         (which would trap the fixed lightbox dialog). -->
    <div class="shell__sky" aria-hidden="true">
      <span class="shell__glow shell__glow--sakura"></span>
      <span class="shell__glow shell__glow--neon"></span>
      <span class="shell__stars"></span>
      <span class="shell__horizon"></span>
    </div>

    <AppHeader />

    <main id="main" class="shell__main">
      <slot />
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
// The shell is the night sky the title sequence plays against: layered radial
// glows, a whisper of twinkling stars and a halftone horizon. The page-level
// <html> owns the opaque background so this layer can sit behind content.
</script>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.shell__skip {
  position: absolute;
  top: -56px;
  left: var(--space-4);
  z-index: 100;
  padding: var(--space-2) var(--space-4);
  background: var(--sakura);
  color: var(--wall-950);
  font-size: var(--step-2);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-decoration: none;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
  transition: top var(--dur-fast) var(--ease-frame);
}

.shell__skip:focus-visible {
  top: var(--space-2);
}

.shell__sky {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.shell__glow {
  position: absolute;
  width: 60vw;
  height: 60vw;
  max-width: 720px;
  max-height: 720px;
  border-radius: 50%;
}

.shell__glow--sakura {
  top: -22vw;
  right: -14vw;
  background: radial-gradient(circle, rgba(255, 93, 143, 0.16), transparent 65%);
}

.shell__glow--neon {
  bottom: -26vw;
  left: -18vw;
  background: radial-gradient(circle, rgba(89, 224, 255, 0.12), transparent 65%);
}

.shell__stars {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(1.5px 1.5px at 12% 22%, rgba(246, 241, 231, 0.8), transparent),
    radial-gradient(1px 1px at 34% 8%, rgba(89, 224, 255, 0.7), transparent),
    radial-gradient(1.5px 1.5px at 58% 16%, rgba(246, 241, 231, 0.6), transparent),
    radial-gradient(1px 1px at 78% 28%, rgba(255, 179, 71, 0.6), transparent),
    radial-gradient(1px 1px at 88% 10%, rgba(246, 241, 231, 0.7), transparent),
    radial-gradient(1.5px 1.5px at 22% 44%, rgba(246, 241, 231, 0.5), transparent);
  animation: twinkle 7s ease-in-out infinite;
}

.shell__horizon {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 34vh;
  background-image: radial-gradient(rgba(246, 241, 231, 0.05) 1px, transparent 1.3px);
  background-size: 10px 10px;
  -webkit-mask-image: linear-gradient(to top, #000, transparent);
  mask-image: linear-gradient(to top, #000, transparent);
}

.shell__main {
  flex: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-5) var(--space-9);
}

@media (min-width: 768px) {
  .shell__main {
    padding: var(--space-9) var(--space-6) var(--space-10);
  }
}
</style>
