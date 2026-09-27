<template>
  <header class="header">
    <div class="header__inner">
      <NuxtLink to="/" class="header__brand" aria-label="Anime Archive, home">
        <span class="header__seal" aria-hidden="true">
          <img
            class="header__seal-img"
            src="/logo.png"
            alt=""
            width="128"
            height="128"
            decoding="async"
          >
        </span>
        <span class="header__word">Anime <em>Archive</em></span>
        <span class="header__jp" aria-hidden="true">アーカイブ</span>
      </NuxtLink>

      <p class="header__tag">Private frame collection</p>

      <nav class="header__nav" aria-label="Primary">
        <NuxtLink to="/" class="header__link">Archive</NuxtLink>
        <NuxtLink to="/upload" class="header__cta">
          <svg class="header__cta-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8 11V2.5M4.5 6 8 2.5 11.5 6M2.5 13.5h11" stroke-linecap="square" />
          </svg>
          Add frame
        </NuxtLink>
      </nav>
    </div>
    <!-- Sakura→neon beam replaces the old solid border. -->
    <div class="header__beam" aria-hidden="true"></div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(11, 14, 26, 0.78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.header__beam {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 93, 143, 0.65) 30%,
    rgba(89, 224, 255, 0.65) 70%,
    transparent
  );
}

.header__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.header__brand {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-3);
  text-decoration: none;
}

/*
 * Brand seal — public/logo.png: the torii/hinomaru woodblock emblem from
 * image-1.png, cut to a transparent disc (see the asset recipe in nuxt.config).
 * It lands with the shared `stamp-in` keyframes, the same hanko press the upload
 * success stamp uses, and keeps the tilt that keyframe ends on so the mark reads
 * as hand-stamped onto the title card rather than pasted onto it. Hover/focus
 * re-press it: the ring ignites and the seal rocks a little further.
 */
.header__seal {
  display: block;
  flex: none;
  align-self: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  animation: stamp-in 520ms var(--ease-snap) both;
  transition: box-shadow var(--dur-base) var(--ease-frame);
}

.header__seal-img {
  display: block;
  width: 100%;
  height: 100%;
  /* drop-shadow follows the disc's alpha, so the glow stays round. */
  filter: drop-shadow(0 1px 5px rgba(11, 14, 26, 0.6));
  transition: transform var(--dur-base) var(--ease-snap),
    filter var(--dur-base) var(--ease-frame);
}

.header__brand:hover .header__seal,
.header__brand:focus-visible .header__seal {
  box-shadow: 0 0 0 1px var(--line-sakura), 0 0 22px rgba(255, 93, 143, 0.4);
}

.header__brand:hover .header__seal-img,
.header__brand:focus-visible .header__seal-img {
  transform: rotate(4deg) scale(1.07);
  filter: drop-shadow(0 0 12px rgba(255, 93, 143, 0.5));
}

.header__word {
  font-family: var(--font-display);
  font-size: var(--step-4);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--paper-100);
  white-space: nowrap;
}

.header__word em {
  font-style: normal;
  color: transparent;
  background: linear-gradient(120deg, var(--sakura), #ff9db4 55%, var(--neon));
  -webkit-background-clip: text;
  background-clip: text;
}

.header__jp {
  display: none;
  font-size: 10px;
  letter-spacing: 0.32em;
  color: var(--paper-200);
  opacity: 0.55;
}

.header__tag {
  display: none;
  font-size: var(--step-1);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--paper-200);
  opacity: 0.65;
}

.header__nav {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.header__link {
  position: relative;
  font-size: var(--step-2);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--paper-200);
  text-decoration: none;
  padding: var(--space-2) 0;
  transition: color var(--dur-fast) var(--ease-frame);
}

.header__link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--sakura), var(--neon));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur-base) var(--ease-frame);
}

.header__link:hover {
  color: var(--paper-100);
}

.header__link:hover::after,
.header__link.router-link-exact-active::after {
  transform: scaleX(1);
}

.header__link.router-link-exact-active {
  color: var(--paper-100);
}

.header__cta {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--sakura);
  color: var(--wall-950);
  font-size: var(--step-2);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-decoration: none;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
  transition: box-shadow var(--dur-fast) var(--ease-frame),
    transform var(--dur-fast) var(--ease-frame);
}

/* Shine sweep on hover. */
.header__cta::before {
  content: '';
  position: absolute;
  top: -50%;
  bottom: -50%;
  left: -30%;
  width: 30%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  transform: translateX(-140%) skewX(-18deg);
  pointer-events: none;
}

.header__cta:hover {
  box-shadow: var(--glow-sakura);
}

.header__cta:hover::before {
  animation: glint 700ms var(--ease-frame);
}

.header__cta:active {
  transform: translateY(1px);
}

.header__cta.router-link-exact-active {
  background: var(--wall-800);
  color: var(--paper-100);
  box-shadow: none;
}

@media (min-width: 900px) {
  .header__inner {
    padding: var(--space-4) var(--space-6);
  }

  .header__seal {
    width: 36px;
    height: 36px;
  }

  .header__tag,
  .header__jp {
    display: block;
  }
}
</style>
