<template>
  <div class="upload-view">
    <section class="upload-view__masthead">
      <p class="upload-view__kicker">
        <span class="upload-view__ep">NEW</span>
        New acquisition
      </p>
      <h1 class="upload-view__title">Catalog a frame</h1>
      <p class="upload-view__sub">
        Choose a still, record where it came from, and set it on the wall.
        It stays in this browser only.
      </p>
    </section>

    <div v-if="uploadedFrame" class="upload-view__done">
      <p class="upload-view__stamp" aria-hidden="true">録</p>
      <h2 class="upload-view__done-title">Frame archived</h2>
      <p class="upload-view__done-text">
        “{{ uploadedFrame.title }}” is now on the wall in this browser.
      </p>
      <div class="upload-view__done-actions">
        <NuxtLink to="/" class="upload-view__cta">Back to the wall</NuxtLink>
        <button type="button" class="upload-view__cta upload-view__cta--quiet" @click="startAnother">
          Catalog another
        </button>
      </div>
    </div>

    <form v-else class="upload-view__flow" @submit.prevent="submitFrame">
      <div class="upload-view__stage">
        <UploadPreview
          v-if="previewUrl"
          :preview-url="previewUrl"
          :dimensions="dimensions"
          :model="formModel"
        />
        <UploadDropzone
          v-else
          :errors="upload.errors.value"
          @file-selected="onFileSelected"
        />
        <p v-if="previewUrl && upload.errors.value" class="upload-view__error" role="alert">
          {{ upload.errors.value }}
        </p>
      </div>

      <div class="upload-view__panel">
        <UploadForm
          :model="formModel"
          :disabled="!upload.hasFile.value || upload.isUploading.value"
          :submit-label="upload.isUploading.value ? 'Archiving…' : 'Add to the archive'"
          @update:model="patchForm"
          @submit="submitFrame"
          @cancel="cancelUpload"
          @reset-form="resetForm"
        />

        <div v-if="upload.isUploading.value || upload.uploadStatus.value" class="upload-view__status" aria-live="polite">
          <div
            v-if="upload.isUploading.value"
            class="upload-view__progress"
            role="progressbar"
            :aria-valuenow="upload.uploadPercent.value"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="upload-view__progress-fill" :style="{ width: `${upload.uploadPercent.value}%` }"></div>
          </div>
          <p class="upload-view__status-text">{{ upload.uploadStatus.value }}</p>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useUpload } from '~/composables/useUpload'
import { useFrames } from '~/composables/useFrames'
import type { Frame, FrameDraft } from '~/services/storage/types'
import type { UploadFormModel } from '~/components/upload/UploadForm.vue'

const upload = useUpload()
const { addFrame } = useFrames()

const formModel = reactive<UploadFormModel>({
  title: '',
  anime: '',
  episode: '',
  tagsText: '',
  note: '',
})

const uploadedFrame = ref<Frame | null>(null)

// Unwrap the composable refs once; the template reads these directly.
const previewUrl = upload.previewUrl
const dimensions = upload.dimensions

function patchForm(patch: Partial<UploadFormModel>): void {
  Object.assign(formModel, patch)
}

function onFileSelected(file: File): void {
  void upload.selectFile(file)
}

async function submitFrame(): Promise<void> {
  if (!upload.hasFile.value || upload.isUploading.value) return
  if (!formModel.title.trim() || !formModel.anime.trim()) {
    upload.errors.value = 'A title and series are needed before the frame can be archived.'
    return
  }

  const tags = formModel.tagsText
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const draft: FrameDraft = {
    title: formModel.title,
    anime: formModel.anime,
    episode: formModel.episode,
    // The archive no longer captures a timecode; the field stays in the model
    // so fixture/imported frames keep rendering their burn-in.
    timestamp: '',
    tags,
    note: formModel.note,
    src: upload.previewUrl.value,
    width: dimensions.value.width,
    height: dimensions.value.height,
  }

  const ok = await upload.submit(draft)
  if (ok && upload.uploadedFrame.value) {
    addFrame(upload.uploadedFrame.value)
    uploadedFrame.value = upload.uploadedFrame.value
    upload.reset(false)
  }
}

function startAnother(): void {
  uploadedFrame.value = null
  resetForm()
}

function resetForm(): void {
  formModel.title = ''
  formModel.anime = ''
  formModel.episode = ''
  formModel.tagsText = ''
  formModel.note = ''
  upload.reset()
}

function cancelUpload(): void {
  resetForm()
  navigateTo('/')
}

useHead({
  title: 'Anime Archive — Catalog a frame',
})
</script>

<style scoped>
.upload-view {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

.upload-view__masthead {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.upload-view__kicker {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--step-1);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--paper-200);
}

.upload-view__ep {
  padding: 2px var(--space-2);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--wall-950);
  background: var(--sunset);
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%);
  box-shadow: 0 0 14px rgba(255, 179, 71, 0.45);
}

.upload-view__title {
  font-size: clamp(var(--step-6), 6vw, var(--step-7));
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--paper-100);
}

/* Skewed gradient underline, echoing the gallery masthead. */
.upload-view__title::after {
  content: '';
  display: block;
  width: 72px;
  height: 5px;
  margin-top: var(--space-3);
  background: linear-gradient(90deg, var(--sakura), var(--neon));
  clip-path: polygon(0 0, 100% 0, calc(100% - 7px) 100%, 0 100%);
}

.upload-view__sub {
  max-width: 52ch;
  font-size: var(--step-4);
  color: var(--paper-200);
}

.upload-view__flow {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  align-items: start;
}

@media (min-width: 880px) {
  .upload-view__flow {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  }
}

.upload-view__stage {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.upload-view__error {
  padding: var(--space-3) var(--space-4);
  font-size: var(--step-2);
  color: #ff8fb0;
  border: 1px solid var(--sakura);
  background: rgba(255, 93, 143, 0.08);
}

.upload-view__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  background: rgba(17, 22, 41, 0.72);
  border: 1px solid var(--wall-line);
  clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% 100%, 0 100%);
}

.upload-view__status {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-top: 1px solid var(--wall-line);
  padding-top: var(--space-4);
}

.upload-view__progress {
  height: 6px;
  width: 100%;
  background: var(--wall-950);
  border: 1px solid var(--wall-line);
  overflow: hidden;
}

.upload-view__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sakura), var(--neon));
  box-shadow: 0 0 10px rgba(89, 224, 255, 0.5);
  transition: width var(--dur-base) var(--ease-frame);
}

.upload-view__status-text {
  font-size: var(--step-2);
  color: var(--paper-200);
}

.upload-view__done {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-6);
  border: 1px solid var(--wall-line);
  background: var(--wall-900);
  clip-path: polygon(
    0 0,
    calc(100% - var(--cut-lg)) 0,
    100% var(--cut-lg),
    100% 100%,
    var(--cut-lg) 100%,
    0 calc(100% - var(--cut-lg))
  );
}

/* Hanko-style "archived" stamp; pops in on success (base keyframes). */
.upload-view__stamp {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
  color: var(--sakura);
  border: 4px double var(--sakura);
  border-radius: 50%;
  box-shadow: 0 0 24px rgba(255, 93, 143, 0.35);
  animation: stamp-in 520ms var(--ease-snap) both;
}

.upload-view__done-title {
  font-size: var(--step-6);
  color: var(--paper-100);
}

.upload-view__done-text {
  font-size: var(--step-3);
  color: var(--paper-200);
}

.upload-view__done-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.upload-view__cta {
  padding: var(--space-3) var(--space-5);
  font-size: var(--step-2);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-decoration: none;
  color: var(--wall-950);
  background: var(--sakura);
  border: 0;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
  transition: background var(--dur-fast) var(--ease-frame),
    box-shadow var(--dur-fast) var(--ease-frame);
}

.upload-view__cta:hover {
  background: #ff7ba3;
  box-shadow: var(--glow-sakura);
}

.upload-view__cta--quiet {
  color: var(--paper-200);
  background: transparent;
  border: 1px solid var(--wall-line);
}

.upload-view__cta--quiet:hover {
  color: var(--paper-100);
  background: transparent;
  border-color: var(--line-neon);
  box-shadow: none;
}
</style>
