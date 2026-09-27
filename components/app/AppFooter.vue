<template>
  <footer class="footer">
    <!-- Film-strip perforation border; decorative. -->
    <div class="footer__reel" aria-hidden="true"></div>

    <div class="footer__inner">
      <div class="footer__credits">
        <p class="footer__line">
          <span class="footer__title">Anime Archive</span>
          — frames preserved by a few cousins, for a few cousins.
        </p>
        <p class="footer__note">
          Stored in this browser only. Nothing is shared, synced, or uploaded.
        </p>
      </div>

      <p class="footer__end" aria-hidden="true">
        <span class="footer__end-jp">以上</span>
        <span class="footer__end-label">End of episode</span>
      </p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  position: relative;
}

.footer__reel {
  height: 12px;
  border-top: 1px solid var(--wall-line);
  border-bottom: 1px solid var(--wall-line);
  background-color: var(--wall-900);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='12' viewBox='0 0 28 12'%3E%3Crect x='6' y='3' width='14' height='6' rx='1.5' fill='%230b0e1a'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
  background-position: center;
}

.footer__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.footer__credits {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.footer__line {
  font-size: var(--step-2);
  color: var(--paper-200);
}

.footer__title {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--paper-100);
  text-decoration: underline;
  text-decoration-color: var(--line-sakura);
  text-underline-offset: 4px;
}

.footer__note {
  font-size: var(--step-1);
  color: var(--paper-200);
  opacity: 0.6;
}

.footer__end {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.footer__end::before {
  content: '';
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, var(--sakura), transparent);
  flex: none;
}

.footer__end-jp {
  font-family: var(--font-display);
  font-size: var(--step-5);
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--sakura);
}

.footer__end-label {
  font-size: var(--step-1);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--paper-200);
  opacity: 0.6;
}

@media (min-width: 900px) {
  .footer__inner {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    padding: var(--space-6) var(--space-6);
  }
}
</style>
