import { computed, ref, shallowRef } from 'vue'
import localAdapter from '../services/storage/localAdapter'
import { readImageSize } from '../services/storage/localAdapter'
import type { Frame, FrameDraft, FrameStorageAdapter, UploadProgress } from '../services/storage/types'

const MAX_FILE_BYTES = 25 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

export function useUpload(adapter: FrameStorageAdapter = localAdapter) {
  const file = ref<File | null>(null)
  const previewUrl = shallowRef('')
  const dimensions = shallowRef({ width: 0, height: 0 })
  const errors = ref('')
  const isUploading = ref(false)
  const progress = shallowRef<UploadProgress | null>(null)
  const uploadedFrame = shallowRef<Frame | null>(null)

  const hasFile = computed(() => file.value !== null)
  const uploadPercent = computed(() => progress.value?.percent ?? 0)
  const uploadStatus = computed(() => {
    if (isUploading.value) {
      return (progress.value?.percent ?? 0) > 0
        ? `Saving frame · ${uploadPercent.value}%`
        : 'Preparing frame'
    }
    if (uploadedFrame.value) {
      return 'Frame added to this browser'
    }
    return ''
  })

  function revokePreview(): void {
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value)
    }
    previewUrl.value = ''
  }

  function clearTransientState(): void {
    errors.value = ''
    progress.value = null
    uploadedFrame.value = null
  }

  async function selectFile(nextFile: File | null): Promise<void> {
    revokePreview()
    clearTransientState()

    if (!nextFile) {
      file.value = null
      dimensions.value = { width: 0, height: 0 }
      return
    }

    if (!IMAGE_TYPES.has(nextFile.type)) {
      errors.value = 'Choose a JPEG, PNG, WebP, GIF, or AVIF image.'
      file.value = null
      return
    }

    if (nextFile.size > MAX_FILE_BYTES) {
      errors.value = 'This frame is larger than 25 MB. Try a smaller export.'
      file.value = null
      return
    }

    file.value = nextFile
    const objectUrl = URL.createObjectURL(nextFile)
    previewUrl.value = objectUrl

    try {
      dimensions.value = await readImageSize(objectUrl)
    }
    catch {
      dimensions.value = { width: 0, height: 0 }
    }
  }

  function handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement
    const selectedFile = input.files?.[0] ?? null
    void selectFile(selectedFile)
    input.value = ''
  }

  async function submit(metadata: FrameDraft): Promise<boolean> {
    if (!file.value || isUploading.value) {
      return false
    }

    errors.value = ''
    isUploading.value = true
    progress.value = { loaded: file.value.size, total: file.value.size, percent: 0 }

    try {
      const created = await adapter.create(metadata, file.value, (nextProgress) => {
        progress.value = nextProgress
      })
      uploadedFrame.value = created
      progress.value = { loaded: file.value.size, total: file.value.size, percent: 100 }
      return true
    }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The frame could not be saved.'
      errors.value = message
      return false
    }
    finally {
      isUploading.value = false
    }
  }

  function reset(clearChosenFile = true): void {
    if (clearChosenFile) {
      file.value = null
    }
    revokePreview()
    dimensions.value = { width: 0, height: 0 }
    clearTransientState()
  }

  return {
    file,
    previewUrl,
    dimensions,
    errors,
    isUploading,
    progress,
    uploadedFrame,
    hasFile,
    uploadPercent,
    uploadStatus,
    selectFile,
    handleFileInput,
    submit,
    reset,
  }
}
