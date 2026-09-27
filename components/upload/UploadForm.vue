<template>
  <form class="form" @submit.prevent="onSubmit">
    <div class="form__row">
      <label class="form__label" for="up-title">
        <span class="form__num" aria-hidden="true">01</span>
        Title
      </label>
      <input
        id="up-title"
        class="form__input"
        type="text"
        :value="model.title"
        placeholder="e.g. Rain on the crossing"
        required
        @input="patch({ title: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <div class="form__grid">
      <div class="form__row">
        <label class="form__label" for="up-anime">
          <span class="form__num" aria-hidden="true">02</span>
          Series
        </label>
        <input
          id="up-anime"
          class="form__input"
          type="text"
          :value="model.anime"
          placeholder="e.g. Kagerou Line"
          required
          @input="patch({ anime: ($event.target as HTMLInputElement).value })"
        >
      </div>

      <div class="form__row">
        <label class="form__label" for="up-episode">
          <span class="form__num" aria-hidden="true">03</span>
          Episode
        </label>
        <input
          id="up-episode"
          class="form__input"
          type="text"
          :value="model.episode"
          placeholder="EP 04"
          @input="patch({ episode: ($event.target as HTMLInputElement).value })"
        >
      </div>

      <div class="form__row">
        <label class="form__label" for="up-tags">
          <span class="form__num" aria-hidden="true">04</span>
          Tags
        </label>
        <input
          id="up-tags"
          class="form__input"
          type="text"
          :value="model.tagsText"
          placeholder="rain, city, dusk"
          @input="patch({ tagsText: ($event.target as HTMLInputElement).value })"
        >
      </div>
    </div>

    <div class="form__row">
      <label class="form__label" for="up-note">
        <span class="form__num" aria-hidden="true">05</span>
        Note
      </label>
      <textarea
        id="up-note"
        class="form__input form__input--area"
        rows="3"
        :value="model.note"
        placeholder="What makes this frame worth keeping?"
        @input="patch({ note: ($event.target as HTMLInputElement).value })"
      ></textarea>
    </div>

    <div class="form__actions">
      <button
        type="submit"
        class="form__submit"
        :disabled="disabled"
      >
        {{ submitLabel }}
      </button>
      <button type="button" class="form__secondary" @click="emit('cancel')">Cancel</button>
      <button type="button" class="form__secondary form__secondary--quiet" @click="emit('reset-form')">Reset</button>
    </div>
  </form>
</template>

<script lang="ts">
export interface UploadFormModel {
  title: string
  anime: string
  episode: string
  tagsText: string
  note: string
}
</script>

<script setup lang="ts">
defineProps<{
  model: UploadFormModel
  disabled: boolean
  submitLabel: string
}>()

const emit = defineEmits<{
  'update:model': [patch: Partial<UploadFormModel>]
  submit: []
  cancel: []
  'reset-form': []
}>()

function patch(next: Partial<UploadFormModel>): void {
  emit('update:model', next)
}

function onSubmit(): void {
  emit('submit')
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
}

.form__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--step-1);
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--neon);
  opacity: 0.85;
}

/* Field codes: production-slate numbering (01/TITLE, 02/SERIES, …). */
.form__num {
  font-size: 9px;
  letter-spacing: 0.06em;
  padding: 1px 5px;
  color: var(--neon);
  border: 1px solid rgba(89, 224, 255, 0.4);
  clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%);
}

.form__input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: var(--step-3);
  color: var(--paper-100);
  background: rgba(11, 14, 26, 0.7);
  border: 1px solid var(--wall-line);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  transition: border-color var(--dur-fast) var(--ease-frame),
    box-shadow var(--dur-fast) var(--ease-frame);
}

.form__input::placeholder {
  color: var(--paper-200);
  opacity: 0.4;
}

.form__input:hover {
  border-color: rgba(246, 241, 231, 0.3);
}

.form__input:focus {
  outline: none;
  border-color: var(--neon);
  box-shadow: var(--glow-neon);
}

.form__input--area {
  resize: vertical;
  min-height: 80px;
}

.form__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.form__submit {
  position: relative;
  overflow: hidden;
  padding: var(--space-3) var(--space-5);
  font-size: var(--step-3);
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--wall-950);
  background: var(--sakura);
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
  transition: box-shadow var(--dur-fast) var(--ease-frame),
    transform var(--dur-fast) var(--ease-frame);
}

/* Shine sweep. */
.form__submit::before {
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

.form__submit:hover:not(:disabled) {
  box-shadow: var(--glow-sakura);
}

.form__submit:hover:not(:disabled)::before {
  animation: glint 700ms var(--ease-frame);
}

.form__submit:active:not(:disabled) {
  transform: translateY(1px);
}

.form__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form__secondary {
  padding: var(--space-3) var(--space-4);
  font-size: var(--step-3);
  font-weight: 500;
  color: var(--paper-200);
  border: 1px solid var(--wall-line);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  transition: color var(--dur-fast) var(--ease-frame),
    border-color var(--dur-fast) var(--ease-frame);
}

.form__secondary:hover {
  color: var(--paper-100);
  border-color: var(--line-neon);
}

.form__secondary--quiet {
  border-color: transparent;
  opacity: 0.7;
}

.form__secondary--quiet:hover {
  border-color: transparent;
  opacity: 1;
}
</style>
