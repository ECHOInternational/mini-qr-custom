<script setup lang="ts">
import CopyImageModal from '@/components/CopyImageModal.vue'
import DataTemplatesModal from '@/components/DataTemplatesModal.vue'
import StyledQRCode from '@/components/StyledQRCode.vue'
import { Combobox } from '@/components/ui/Combobox'
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import {
  copyImageToClipboard,
  downloadJpgElement,
  downloadPngElement,
  downloadSvgElement,
  getJpgElement,
  getPngElement,
  getSvgString
} from '@/utils/convertToImage'
import { IS_COPY_IMAGE_TO_CLIPBOARD_SUPPORTED } from '@/utils/clipboard'
import { getNumericCSSValue } from '@/utils/formatting'
import { allQrCodePresets, defaultPreset, type Preset } from '@/utils/qrCodePresets'
import { useMediaQuery } from '@vueuse/core'
import {
  type CornerDotType,
  type CornerSquareType,
  type DotType,
  type ErrorCorrectionLevel,
  type Options as StyledQRCodeProps
} from 'qr-code-styling'
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import 'vue-i18n'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  initialData?: string
}>()

const mainContentContainer = ref<HTMLElement | null>(null)
const isLarge = useMediaQuery('(min-width: 768px)')
const isLikelyMobileDevice = computed(() => {
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
})

//#region /** locale */
const { t } = useI18n()
//#endregion

//#region /* QR code style settings */
const data = ref(props.initialData || import.meta.env.VITE_DEFAULT_DATA_TO_ENCODE || '')
const debouncedData = ref(data.value)
let dataDebounceTimer: ReturnType<typeof setTimeout>

watch(
  data,
  (newVal) => {
    clearTimeout(dataDebounceTimer)
    dataDebounceTimer = setTimeout(() => {
      debouncedData.value = newVal
    }, 500)
  },
  { immediate: true }
)
const image = ref()
const size = ref(SCREEN_SIZE) // Unified width/height since QR codes should always be square, default to screen size
const isSizeEditing = ref(false) // Track if user is editing size directly
const isBorderRadiusEditing = ref(false) // Track if user is editing border radius directly
const isImageMarginEditing = ref(false) // Track if user is editing image margin directly
const imageMargin = ref()

// Computed properties for width and height - both derive from unified size
const width = computed(() => size.value)
const height = computed(() => size.value)

watch(
  () => props.initialData,
  (newValue) => {
    if (newValue) {
      data.value = newValue
    }
  }
)

// Unified foreground color for all QR code elements
const foregroundColor = ref()
const dotsOptionsType = ref()
const cornersSquareOptionsType = ref()
const cornersDotOptionsType = ref()

// Computed properties that tie all color elements to foregroundColor
const dotsOptionsColor = computed(() => foregroundColor.value)
const cornersSquareOptionsColor = computed(() => foregroundColor.value)
const cornersDotOptionsColor = computed(() => foregroundColor.value)
const styleBorderRadius = ref()
const styledBorderRadiusFormatted = computed(() => `${styleBorderRadius.value}px`)
const styleBackground = ref(defaultPreset.style.background)
const lastBackground = ref(defaultPreset.style.background)
const includeBackground = ref(true)
watch(
  includeBackground,
  (newIncludeBackground) => {
    if (!newIncludeBackground) {
      lastBackground.value = styleBackground.value
      styleBackground.value = 'transparent'
    } else {
      styleBackground.value = lastBackground.value
    }
  },
  {
    immediate: true
  }
)

const dotsOptions = computed(() => ({
  color: dotsOptionsColor.value,
  type: dotsOptionsType.value
}))
const cornersSquareOptions = computed(() => ({
  color: cornersSquareOptionsColor.value,
  type: cornersSquareOptionsType.value
}))
const cornersDotOptions = computed(() => ({
  color: cornersDotOptionsColor.value,
  type: cornersDotOptionsType.value
}))
const style = computed(() => ({
  borderRadius: styledBorderRadiusFormatted.value,
  background: styleBackground.value
}))
const imageOptions = computed(() => ({
  margin: imageMargin.value
}))
const qrOptions = computed(() => ({
  errorCorrectionLevel: errorCorrectionLevel.value
}))

// Automatic margin based on background color
// 0 margin when no background (transparent), 1 margin when background is present
const margin = computed(() => {
  return includeBackground.value ? 1 : 0
})

const qrCodeProps = computed<StyledQRCodeProps>(() => ({
  data: debouncedData.value || 'Have a beautiful day!',
  image: image.value,
  width: width.value,
  height: height.value,
  margin: margin.value,
  dotsOptions: dotsOptions.value,
  cornersSquareOptions: cornersSquareOptions.value,
  cornersDotOptions: cornersDotOptions.value,
  imageOptions: imageOptions.value,
  qrOptions: qrOptions.value
}))

function setScreenSize() {
  size.value = SCREEN_SIZE
}

function setPrintSize() {
  size.value = PRINT_SIZE
}

function startSizeEditing() {
  isSizeEditing.value = true
  nextTick(() => {
    const input = document.querySelector('input[type="number"]') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

function finishSizeEditing() {
  isSizeEditing.value = false
  // Ensure the value is a positive integer
  if (size.value < 1) size.value = 1
  // Round to nearest integer if user entered decimal
  size.value = Math.round(size.value)
}

function handleSizeKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === 'Escape') {
    finishSizeEditing()
    ;(event.target as HTMLInputElement).blur()
  }
}

function startBorderRadiusEditing() {
  isBorderRadiusEditing.value = true
  nextTick(() => {
    const input = document.querySelector('#border-radius-input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

function finishBorderRadiusEditing() {
  isBorderRadiusEditing.value = false
  // Ensure the value is within valid range (0-100%)
  if (styleBorderRadius.value < 0) styleBorderRadius.value = 0
  if (styleBorderRadius.value > 100) styleBorderRadius.value = 100
  // Round to nearest integer
  styleBorderRadius.value = Math.round(styleBorderRadius.value)
}

function handleBorderRadiusKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === 'Escape') {
    finishBorderRadiusEditing()
    ;(event.target as HTMLInputElement).blur()
  }
}

function startImageMarginEditing() {
  isImageMarginEditing.value = true
  nextTick(() => {
    const input = document.querySelector('#image-margin-input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
  })
}

function finishImageMarginEditing() {
  isImageMarginEditing.value = false
  // Ensure the value is a positive integer or zero
  if (imageMargin.value < 0) imageMargin.value = 0
  // Round to nearest integer if user entered decimal
  imageMargin.value = Math.round(imageMargin.value)
}

function handleImageMarginKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === 'Escape') {
    finishImageMarginEditing()
    ;(event.target as HTMLInputElement).blur()
  }
}

function selectBackgroundColor(color: string) {
  if (color === 'transparent') {
    includeBackground.value = false
    styleBackground.value = 'transparent'
  } else {
    includeBackground.value = true
    styleBackground.value = color
    lastBackground.value = color
  }
}

// Image state computed properties
const hasImage = computed(() => !!image.value)
const isBase64Image = computed(() => image.value?.startsWith('data:'))
const isUrlImage = computed(() => hasImage.value && !isBase64Image.value)

function uploadImage() {
  console.debug('Uploading image')
  const imageInput = document.createElement('input')
  imageInput.type = 'file'
  imageInput.accept = 'image/*'
  imageInput.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files) {
      const file = target.files[0]
      const reader = new FileReader()
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const target = event.target as FileReader
        const result = target.result as string
        image.value = result
      }
      reader.readAsDataURL(file)
    }
  }
  imageInput.click()
}

function clearImage() {
  console.debug('Clearing image')
  image.value = ''
}
// #endregion

// Size presets
const SCREEN_SIZE = 200
const PRINT_SIZE = 1000

//#region /* Brand colors configuration */
const brandColors = [
  { name: 'Desaturated Emerald', color: '#006F5E' },
  { name: 'Ivory White', color: '#EFE6D1' },
  { name: 'Warm Sandstone', color: '#9DA441' },
  { name: 'Slate Blue-Gray', color: '#3C434C' },
  { name: 'Smokey Steel Blue', color: '#6B8C9E' },
  { name: 'Muted Coral', color: '#E27D60' },
  { name: 'Dusty Olive', color: '#A3A380' },
  { name: 'White', color: '#FFFFFF' },
  { name: 'Black', color: '#000000' }
]
//#endregion

//#region /* Error correction level */
const errorCorrectionLevels: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H']
const errorCorrectionLevel = ref<ErrorCorrectionLevel>('Q')
const ERROR_CORRECTION_LEVEL_LABELS: Record<ErrorCorrectionLevel, string> = {
  L: `Low (7%)`,
  M: `Medium (15%)`,
  Q: `High (25%)`,
  H: `Highest (30%)`
}
const recommendedErrorCorrectionLevel = computed<ErrorCorrectionLevel | null>(() => {
  if (!data.value) return null
  if (data.value.length <= 50) {
    return 'H'
  } else if (data.value.length <= 150) {
    return 'Q'
  } else if (data.value.length <= 500) {
    return 'M'
  } else {
    return 'L'
  }
})
//#endregion

// #region /* Preset settings */
const isPresetSelectOpen = ref(false)
const allPresetOptions = computed(() => {
  return allQrCodePresets.map((preset) => ({ value: preset.name, label: t(preset.name) }))
})
const selectedPreset = ref<
  Preset & { key?: string; qrOptions?: { errorCorrectionLevel: ErrorCorrectionLevel } }
>(defaultPreset)
// Track if this is the initial load
const isInitialPresetLoad = ref(true)

watch(
  selectedPreset,
  () => {
    // Only update data on the very first preset load and if no data exists
    if (isInitialPresetLoad.value && !data.value) {
      data.value = selectedPreset.value.data
    }
    isInitialPresetLoad.value = false

    image.value = selectedPreset.value.image
    size.value = selectedPreset.value.width // Use width as the size since QR codes are square
    imageMargin.value = selectedPreset.value.imageOptions.margin
    // Set unified foreground color (use dots color from preset)
    foregroundColor.value = selectedPreset.value.dotsOptions.color
    dotsOptionsType.value = selectedPreset.value.dotsOptions.type
    cornersSquareOptionsType.value = selectedPreset.value.cornersSquareOptions.type
    cornersDotOptionsType.value = selectedPreset.value.cornersDotOptions.type
    styleBorderRadius.value = getNumericCSSValue(selectedPreset.value.style.borderRadius as string)
    styleBackground.value = selectedPreset.value.style.background
    // Update lastBackground when loading a preset with non-transparent background
    if (selectedPreset.value.style.background !== 'transparent') {
      lastBackground.value = selectedPreset.value.style.background
    }
    includeBackground.value = selectedPreset.value.style.background !== 'transparent'
    errorCorrectionLevel.value =
      selectedPreset.value.qrOptions && selectedPreset.value.qrOptions.errorCorrectionLevel
        ? selectedPreset.value.qrOptions.errorCorrectionLevel
        : 'Q'
  },
  { immediate: true }
)

const selectedPresetKey = ref<string>(defaultPreset.name)
watch(
  selectedPresetKey,
  (newKey, prevKey) => {
    if (newKey === prevKey || !newKey) return

    const updatedPreset = allQrCodePresets.find((preset) => preset.name === newKey)
    if (updatedPreset) {
      selectedPreset.value = updatedPreset
    }
  },
  { immediate: true }
)

/**
 * Refreshes the current preset by reapplying its default values
 */
function refreshCurrentPreset() {
  // Find the current preset in allQrCodePresets to get the original values
  const currentPreset = allQrCodePresets.find((preset) => preset.name === selectedPresetKey.value)
  if (currentPreset) {
    console.log('Refreshing preset:', currentPreset.name)

    // Don't update data to preserve user input
    image.value = currentPreset.image
    size.value = currentPreset.width // Use width as the size since QR codes are square
    imageMargin.value = currentPreset.imageOptions.margin
    // Set unified foreground color (use dots color from preset)
    foregroundColor.value = currentPreset.dotsOptions.color
    dotsOptionsType.value = currentPreset.dotsOptions.type
    cornersSquareOptionsType.value = currentPreset.cornersSquareOptions.type
    cornersDotOptionsType.value = currentPreset.cornersDotOptions.type
    styleBorderRadius.value = getNumericCSSValue(currentPreset.style.borderRadius as string)
    styleBackground.value = currentPreset.style.background
    // Update lastBackground when loading a preset with non-transparent background
    if (currentPreset.style.background !== 'transparent') {
      lastBackground.value = currentPreset.style.background
    }
    includeBackground.value = currentPreset.style.background !== 'transparent'
    errorCorrectionLevel.value =
      currentPreset.qrOptions && currentPreset.qrOptions.errorCorrectionLevel
        ? currentPreset.qrOptions.errorCorrectionLevel
        : 'Q'

    // Update the selectedPreset ref to keep it in sync
    selectedPreset.value = currentPreset
  }
}
//#endregion

//#region /* General Export - download qr code and copy to clipboard */
const isExportButtonDisabled = computed(() => {
  return !data.value
})

const PREVIEW_QRCODE_DIM_UNIT = 200

/**
 * Calculates the dimensions for QR code export
 */
function getExportDimensions() {
  return {
    width: width.value,
    height: height.value
  }
}

// #region Copy image modal (Safari fallback)
const showSafariCopyImageModal = ref(false)
const copyModalIsLoading = ref(false)
const copyModalImageSrc = ref<string | null>(null)

async function openCopyModal() {
  const el = document.getElementById('element-to-export')
  if (!el) return
  copyModalIsLoading.value = true
  try {
    copyModalImageSrc.value = await getPngElement(
      el,
      getExportDimensions(),
      styledBorderRadiusFormatted.value
    )
    showSafariCopyImageModal.value = true
  } catch (error) {
    console.error('Error preparing image for copy modal:', error)
  } finally {
    copyModalIsLoading.value = false
  }
}

function closeCopyModal() {
  showSafariCopyImageModal.value = false
  copyModalImageSrc.value = null
}
// #endregion

function copyQRToClipboard() {
  const el = document.getElementById('element-to-export')
  if (!el) {
    return
  }
  if (IS_COPY_IMAGE_TO_CLIPBOARD_SUPPORTED) {
    copyImageToClipboard(el, getExportDimensions(), styledBorderRadiusFormatted.value)
  } else if (!isLikelyMobileDevice.value) {
    // for now we only open the copy image modal on safari desktop because
    // this modal will be hidden behind the export image modal on mobile viewport.
    openCopyModal()
  }
}

/**
 * Downloads QR code in specified format
 * @param format The format to download: 'png', 'svg', or 'jpg'
 */
function downloadQRImage(format: 'png' | 'svg' | 'jpg') {
  const formatConfig = {
    png: { fn: downloadPngElement, filename: 'qr-code.png' },
    svg: { fn: downloadSvgElement, filename: 'qr-code.svg' },
    jpg: { fn: downloadJpgElement, filename: 'qr-code.jpg', extraOptions: { bgcolor: 'white' } }
  }[format]

  const el = document.getElementById('element-to-export')
  if (!el) {
    return
  }

  formatConfig.fn(
    el,
    formatConfig.filename,
    { ...getExportDimensions(), ...formatConfig.extraOptions },
    styledBorderRadiusFormatted.value
  )
}
onMounted(() => {
  // Set initial data if provided through props
  if (props.initialData) {
    data.value = props.initialData
  }
})
//#endregion

//#region /* Data modal */
const isDataModalVisible = ref(false)
const openDataModal = () => {
  isDataModalVisible.value = true
}

const closeDataModal = () => {
  isDataModalVisible.value = false
}

const updateDataFromModal = (newData: string) => {
  data.value = newData
  // Optionally trigger QR code regeneration here if needed
}
// #endregion

//#region /* Dynamic padding for mobile drawer */
const drawerTriggerHeight = ref(0)
const BUFFER_PADDING = 20 // Extra space below the drawer trigger

function updateDrawerTriggerHeight() {
  nextTick(() => {
    const el = document.getElementById('drawer-preview-container')
    if (el) {
      drawerTriggerHeight.value = el.offsetHeight
    } else {
      drawerTriggerHeight.value = 0 // Fallback if element not found
    }
  })
}

watch(
  isLarge,
  (newIsLarge) => {
    if (!newIsLarge) {
      updateDrawerTriggerHeight() // Drawer is now visible
    } else {
      drawerTriggerHeight.value = 0 // Drawer is hidden, reset padding effect
    }
  },
  { immediate: true } // Run on initial load
)

const mainDivPaddingStyle = computed(() => {
  if (!isLarge.value && drawerTriggerHeight.value > 0) {
    return { paddingBottom: `${drawerTriggerHeight.value + BUFFER_PADDING}px` }
  }
  return { paddingBottom: '0px' } // Default for large screens or if height is 0
})
//#endregion
</script>

<template>
  <div
    class="flex items-start justify-center gap-4 md:flex-row md:gap-6 lg:gap-12 lg:pb-0"
    :style="mainDivPaddingStyle"
  >
    <!-- Sticky sidebar on large screens -->
    <div
      v-if="isLarge"
      ref="mainContentContainer"
      id="main-content-container"
      class="sticky top-0 flex w-full shrink-0 flex-col items-center justify-center p-4 md:w-fit"
    ></div>
    <!-- Bottom sheet on small screens -->
    <Drawer v-else>
      <DrawerTrigger
        id="drawer-preview-container"
        class="fixed inset-x-0 bottom-0 z-10 rounded-t-lg border-t border-solid border-slate-300 bg-white shadow-2xl outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:bg-black dark:focus-visible:ring-zinc-200"
      >
        <div class="flex flex-col items-center">
          <!-- Handle indicator for bottom sheet -->
          <div class="mt-2 h-1 w-16 rounded-full bg-gray-300 dark:bg-gray-700"></div>
          <div :class="['w-full', '-my-8']">
            <div class="flex origin-center scale-[0.7] items-center justify-center md:scale-100">
              <div class="grid place-items-center">
                <div
                  class="relative grid place-items-center overflow-hidden"
                  :style="[
                    style,
                    {
                      width: `${PREVIEW_QRCODE_DIM_UNIT}px`,
                      height: `${PREVIEW_QRCODE_DIM_UNIT}px`
                    }
                  ]"
                >
                  <!-- Checkerboard background for transparent QR codes -->
                  <div
                    v-if="!includeBackground || styleBackground === 'transparent'"
                    class="absolute inset-0"
                    style="
                      background-image:
                        linear-gradient(45deg, #ccc 25%, transparent 25%),
                        linear-gradient(-45deg, #ccc 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #ccc 75%),
                        linear-gradient(-45deg, transparent 75%, #ccc 75%);
                      background-size: 12px 12px;
                      background-position:
                        0 0,
                        0 6px,
                        6px -6px,
                        -6px 0px;
                      opacity: 0.4;
                      z-index: 1;
                    "
                  ></div>
                  <StyledQRCode
                    v-bind="{
                      ...qrCodeProps,
                      data: data?.length > 0 ? data : t('Have nice day!'),
                      width: PREVIEW_QRCODE_DIM_UNIT,
                      height: PREVIEW_QRCODE_DIM_UNIT
                    }"
                    role="img"
                    aria-label="QR code preview"
                    style="position: relative; z-index: 2"
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            class="flex items-center gap-1 py-2 text-center text-sm text-gray-600 dark:text-gray-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              class="inline"
            >
              <path fill="currentColor" d="M12 8l-6 6l1.41 1.41L12 10.83l4.59 4.58L18 14z" />
            </svg>
            {{ t('Export') }}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              class="inline"
            >
              <path fill="currentColor" d="M12 8l-6 6l1.41 1.41L12 10.83l4.59 4.58L18 14z" />
            </svg>
          </div>
        </div>
      </DrawerTrigger>
      <DrawerContent class="flex h-screen flex-col items-center justify-between">
        <div class="flex grow flex-col items-center justify-center gap-4">
          <DrawerTitle>{{ t('Export') }}</DrawerTitle>
          <div ref="mainContentContainer" id="main-content-container" class="w-full"></div>
        </div>
      </DrawerContent>
    </Drawer>

    <!-- Main content -->
    <Teleport to="#main-content-container" v-if="mainContentContainer != null">
      <div id="main-content">
        <div id="qr-code-container" class="grid origin-center place-items-center">
          <!-- Preview wrapper with checkerboard background -->
          <div
            class="relative grid place-items-center overflow-hidden"
            :style="{
              width: `${PREVIEW_QRCODE_DIM_UNIT}px`,
              height: `${PREVIEW_QRCODE_DIM_UNIT}px`
            }"
          >
            <!-- Checkerboard background for transparent QR codes -->
            <div
              v-if="!includeBackground || styleBackground === 'transparent'"
              class="absolute inset-0"
              style="
                background-image:
                  linear-gradient(45deg, #ccc 25%, transparent 25%),
                  linear-gradient(-45deg, #ccc 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #ccc 75%),
                  linear-gradient(-45deg, transparent 75%, #ccc 75%);
                background-size: 12px 12px;
                background-position:
                  0 0,
                  0 6px,
                  6px -6px,
                  -6px 0px;
                opacity: 0.4;
                z-index: 1;
              "
            ></div>
            <!-- Export element (no background, no styling) -->
            <div
              id="element-to-export"
              class="grid place-items-center overflow-hidden"
              :style="[
                style,
                {
                  width: `${PREVIEW_QRCODE_DIM_UNIT}px`,
                  height: `${PREVIEW_QRCODE_DIM_UNIT}px`
                }
              ]"
            >
              <StyledQRCode
                v-bind="{
                  ...qrCodeProps,
                  data: data?.length > 0 ? data : t('Have nice day!'),
                  width: PREVIEW_QRCODE_DIM_UNIT,
                  height: PREVIEW_QRCODE_DIM_UNIT
                }"
                role="img"
                aria-label="QR code"
                style="position: relative; z-index: 2"
              />
            </div>
          </div>
        </div>
        <div class="mt-4 flex flex-col items-center gap-8">
          <div class="flex flex-col items-center justify-center gap-3">
            <button
              id="copy-qr-image-button"
              class="button flex w-fit max-w-full flex-row items-center gap-1"
              @click="copyQRToClipboard"
              :disabled="isExportButtonDisabled"
              :title="
                isExportButtonDisabled
                  ? t('Please enter data to encode first')
                  : t('Copy QR Code to clipboard')
              "
              :aria-label="t('Copy QR Code to clipboard')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <g
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                >
                  <path d="M8 10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z" />
                  <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                </g>
              </svg>
              <p>{{ t('Copy QR Code to clipboard') }}</p>
            </button>
          </div>
          <div id="export-options" class="grid place-items-center gap-4">
            <p class="text-zinc-900 dark:text-zinc-100">{{ t('Export as') }}</p>
            <div class="flex flex-row items-center justify-center gap-2">
              <button
                id="download-qr-image-button-png"
                class="button"
                @click="() => downloadQRImage('png')"
                :disabled="isExportButtonDisabled"
                :title="
                  isExportButtonDisabled
                    ? t('Please enter data to encode first')
                    : t('Download QR Code as PNG')
                "
                :aria-label="t('Download QR Code as PNG')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4" />
                    <text
                      x="1"
                      y="22"
                      fill="currentColor"
                      stroke="none"
                      font-size="11px"
                      font-family="monospace"
                      font-weight="600"
                    >
                      PNG
                    </text>
                  </g>
                </svg>
              </button>
              <button
                id="download-qr-image-button-jpg"
                class="button"
                @click="() => downloadQRImage('jpg')"
                :disabled="isExportButtonDisabled"
                :title="
                  isExportButtonDisabled
                    ? t('Please enter data to encode first')
                    : t('Download QR Code as JPG')
                "
                :aria-label="t('Download QR Code as JPG')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4" />
                    <text
                      x="1"
                      y="22"
                      fill="currentColor"
                      stroke="none"
                      font-size="11px"
                      font-family="monospace"
                      font-weight="600"
                    >
                      JPG
                    </text>
                  </g>
                </svg>
              </button>
              <button
                id="download-qr-image-button-svg"
                class="button"
                @click="() => downloadQRImage('svg')"
                :disabled="isExportButtonDisabled"
                :title="
                  isExportButtonDisabled
                    ? t('Please enter data to encode first')
                    : t('Download QR Code as SVG')
                "
                :aria-label="t('Download QR Code as SVG')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4" />
                    <text
                      x="1"
                      y="22"
                      fill="currentColor"
                      stroke="none"
                      font-size="11px"
                      font-family="monospace"
                      font-weight="600"
                    >
                      SVG
                    </text>
                  </g>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <div
      id="settings"
      class="flex w-full grow flex-col items-start gap-8 overflow-hidden text-start"
    >
      <div class="flex w-full flex-col gap-4">
        <div class="px-2 pb-8 pt-4">
          <section class="space-y-8" aria-labelledby="qr-code-settings-title">
            <div>
              <div class="flex flex-row items-center justify-start gap-2">
                <label class="mt-1">{{ t('Preset') }}:</label>
                <Combobox
                  :items="allPresetOptions"
                  v-model:value="selectedPresetKey"
                  v-model:open="isPresetSelectOpen"
                  :button-label="t('Select QR code preset')"
                  :insert-divider-at-indexes="[0, 2]"
                />
                <button
                  @click="refreshCurrentPreset"
                  class="cursor-pointer text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  :title="t('Reset to preset defaults')"
                  :aria-label="t('Reset to preset defaults')"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                </button>
              </div>
            </div>
            <!-- Visual separator -->
            <div class="border-t border-gray-200 dark:border-gray-700"></div>
            <div class="w-full overflow-hidden">
              <div class="flex w-full flex-col flex-wrap gap-4 sm:flex-row sm:gap-x-8">
                <!-- Data to encode area -->
                <div class="w-full sm:grow">
                  <!-- Data templates button (moved above input) -->
                  <div class="mb-2 flex items-center justify-between">
                    <label for="data">{{ t('Data to encode') }}:</label>
                    <button
                      @click="openDataModal"
                      aria-haspopup="dialog"
                      :aria-expanded="isDataModalVisible"
                      class="secondary-button flex items-center gap-1"
                      :aria-label="t('Open data type generator')"
                    >
                      <span>{{ t('Data templates') }}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                      >
                        <!-- Icon from Tabler Icons by Paweł Kuna - https://github.com/tabler/tabler-icons/blob/master/LICENSE -->
                        <path
                          fill="none"
                          stroke="#888888"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="m7 7l5 5l-5 5m6-10l5 5l-5 5"
                        />
                      </svg>
                    </button>
                  </div>
                  <!-- Data input -->
                  <textarea
                    id="data"
                    v-model="data"
                    class="text-input"
                    style="width: calc(100% - 0.5rem); box-sizing: border-box"
                    :placeholder="t('data to encode e.g. a URL or a string')"
                  ></textarea>
                </div>
              </div>
            </div>
            <!-- Visual separator -->
            <div class="border-t border-gray-200 dark:border-gray-700"></div>
            <div class="w-full">
              <div class="mb-2 flex flex-row items-center gap-2">
                <label> {{ t('Image') }}: </label>
                <!-- Upload image button - only visible when no image is present -->
                <button
                  v-if="!hasImage"
                  class="icon-button flex flex-row items-center"
                  @click="uploadImage"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    >
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                      <path
                        d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2zm-5-10v6"
                      />
                      <path d="M9.5 13.5L12 11l2.5 2.5" />
                    </g>
                  </svg>
                  <span>{{ t('Upload image') }}</span>
                </button>
                <!-- Clear image button - only visible when image is present -->
                <button
                  v-if="hasImage"
                  class="icon-button flex flex-row items-center text-red-600 hover:text-red-700"
                  @click="clearImage"
                  :title="t('Clear image')"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </g>
                  </svg>
                  <span>{{ t('Clear image') }}</span>
                </button>
                <!-- Image margin input -->
                <div class="ml-4 flex items-center gap-2">
                  <span>{{ t('Margin') }}:</span>
                  <span
                    v-if="!isImageMarginEditing"
                    @click="startImageMarginEditing"
                    class="cursor-pointer rounded bg-gray-100 px-2 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                    :title="t('Click to edit image margin directly')"
                  >
                    {{ imageMargin || 0 }}px
                  </span>
                  <input
                    v-else
                    type="number"
                    v-model="imageMargin"
                    @blur="finishImageMarginEditing"
                    @keydown="handleImageMarginKeydown"
                    class="w-16 rounded border px-2 py-1 text-sm"
                    min="0"
                    id="image-margin-input"
                  />
                </div>
              </div>
            </div>
            <!-- Visual separator -->
            <div class="border-t border-gray-200 dark:border-gray-700"></div>
            <div id="color-settings" :class="'flex w-full flex-row flex-wrap gap-8'">
              <div class="flex flex-col gap-2">
                <label>{{ t('Background color') }}:</label>
                <div class="flex flex-row items-center gap-2">
                  <!-- No Background button (separate from brand colors) -->
                  <button
                    @click="selectBackgroundColor('transparent')"
                    :title="t('No Background')"
                    class="relative size-6 cursor-pointer rounded border border-gray-300 transition-transform hover:scale-110"
                    :class="{
                      'ring-2 ring-blue-500': !includeBackground
                    }"
                    :style="{
                      backgroundColor: '#f9fafb',
                      backgroundImage:
                        'linear-gradient(45deg, #9ca3af 25%, transparent 25%), linear-gradient(-45deg, #9ca3af 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #9ca3af 75%), linear-gradient(-45deg, transparent 75%, #9ca3af 75%)',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                    }"
                  >
                    <svg class="absolute inset-0 m-auto size-4" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        :stroke="foregroundColor || '#000000'"
                        stroke-width="3"
                        fill="transparent"
                      />
                      <path
                        d="M5.64 5.64l12.72 12.72"
                        :stroke="foregroundColor || '#000000'"
                        stroke-width="3"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                  <!-- Brand color presets -->
                  <div class="flex gap-1">
                    <button
                      v-for="brandColor in brandColors"
                      :key="brandColor.color"
                      @click="selectBackgroundColor(brandColor.color)"
                      :title="brandColor.name"
                      :style="{ backgroundColor: brandColor.color }"
                      class="size-6 cursor-pointer rounded border border-gray-300 transition-transform hover:scale-110"
                      :class="{
                        'ring-2 ring-blue-500':
                          styleBackground === brandColor.color && includeBackground,
                        'border-gray-400': brandColor.color === '#FFFFFF'
                      }"
                    />
                  </div>
                  <!-- Native color picker -->
                  <input
                    id="background-color"
                    type="color"
                    class="color-input"
                    v-model="styleBackground"
                  />
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <label for="foreground-color">{{ t('Foreground color') }}:</label>
                <div class="flex flex-row items-center gap-2">
                  <!-- Brand color presets -->
                  <div class="flex gap-1">
                    <button
                      v-for="brandColor in brandColors"
                      :key="brandColor.color"
                      @click="foregroundColor = brandColor.color"
                      :title="brandColor.name"
                      :style="{ backgroundColor: brandColor.color }"
                      class="size-6 cursor-pointer rounded border border-gray-300 transition-transform hover:scale-110"
                      :class="{
                        'ring-2 ring-blue-500': foregroundColor === brandColor.color,
                        'border-gray-400': brandColor.color === '#FFFFFF'
                      }"
                    />
                  </div>
                  <!-- Native color picker -->
                  <input
                    id="foreground-color"
                    type="color"
                    class="color-input"
                    v-model="foregroundColor"
                  />
                </div>
              </div>
            </div>
            <div class="flex w-full flex-col gap-8">
              <div class="w-full">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-2">
                    <span>{{ t('Size (px)') }}:</span>
                    <span
                      v-if="!isSizeEditing"
                      @click="startSizeEditing"
                      class="cursor-pointer rounded bg-gray-100 px-2 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                      :title="t('Click to edit size directly')"
                    >
                      {{ size }}px
                    </span>
                    <input
                      v-else
                      type="number"
                      v-model="size"
                      @blur="finishSizeEditing"
                      @keydown="handleSizeKeydown"
                      class="w-20 rounded border px-2 py-1 text-sm"
                      min="1"
                      ref="sizeInput"
                    />
                  </div>
                  <div class="flex gap-2">
                    <button
                      @click="setScreenSize"
                      class="secondary-button text-sm"
                      :title="t('Optimized for screen display')"
                    >
                      {{ t('Screen') }} ({{ SCREEN_SIZE }}px)
                    </button>
                    <button
                      @click="setPrintSize"
                      class="secondary-button text-sm"
                      :title="t('Optimized for print quality')"
                    >
                      {{ t('Print') }} ({{ PRINT_SIZE }}px)
                    </button>
                  </div>
                </div>
                <div class="flex flex-col gap-4">
                  <div class="relative mt-4">
                    <input
                      class="w-full"
                      id="size"
                      type="range"
                      min="200"
                      max="3000"
                      step="10"
                      v-model="size"
                    />
                    <!-- Tick marks for key values positioned proportionally -->
                    <div class="pointer-events-none absolute top-6 w-full text-xs text-gray-500">
                      <div class="relative">
                        <span class="absolute left-0">200px</span>
                        <span class="absolute" style="left: 28.57%">1000px</span>
                        <span class="absolute right-0">3000px</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="w-full">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-2">
                    <span>{{ t('Border radius') }}:</span>
                    <span
                      v-if="!isBorderRadiusEditing"
                      @click="startBorderRadiusEditing"
                      class="cursor-pointer rounded bg-gray-100 px-2 py-1 text-sm hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                      :title="t('Click to edit border radius directly')"
                    >
                      {{ styleBorderRadius }}%
                    </span>
                    <input
                      v-else
                      type="number"
                      v-model="styleBorderRadius"
                      @blur="finishBorderRadiusEditing"
                      @keydown="handleBorderRadiusKeydown"
                      class="w-16 rounded border px-2 py-1 text-sm"
                      min="0"
                      max="100"
                      id="border-radius-input"
                    />
                  </div>
                </div>
                <div class="flex flex-col gap-4">
                  <div class="relative mt-4">
                    <input
                      class="w-full"
                      id="border-radius"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      v-model="styleBorderRadius"
                    />
                    <!-- Tick marks for key values positioned proportionally -->
                    <div class="pointer-events-none absolute top-6 w-full text-xs text-gray-500">
                      <div class="relative">
                        <span class="absolute left-0">0%</span>
                        <span class="absolute" style="left: 25%">25%</span>
                        <span class="absolute" style="left: 50%">50%</span>
                        <span class="absolute" style="left: 75%">75%</span>
                        <span class="absolute right-0">100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              id="dots-squares-settings"
              class="mb-4 flex w-full flex-col flex-wrap gap-6 md:flex-row"
            >
              <fieldset class="flex-1" role="radio" tabindex="0">
                <legend>{{ t('Dots type') }}</legend>
                <div
                  class="radio"
                  v-for="type in [
                    'dots',
                    'rounded',
                    'classy',
                    'classy-rounded',
                    'square',
                    'extra-rounded'
                  ]"
                  :key="type"
                >
                  <input
                    :id="'dotsOptionsType-' + type"
                    type="radio"
                    v-model="dotsOptionsType"
                    :value="type"
                  />
                  <label :for="'dotsOptionsType-' + type">{{ t(type) }}</label>
                </div>
              </fieldset>
              <fieldset class="flex-1" role="radio" tabindex="0">
                <legend>{{ t('Corners Square type') }}</legend>
                <div class="radio" v-for="type in ['dot', 'square', 'extra-rounded']" :key="type">
                  <input
                    :id="'cornersSquareOptionsType-' + type"
                    type="radio"
                    v-model="cornersSquareOptionsType"
                    :value="type"
                  />
                  <label :for="'cornersSquareOptionsType-' + type">{{ t(type) }}</label>
                </div>
              </fieldset>
              <fieldset class="flex-1" role="radio" tabindex="0">
                <legend>{{ t('Corners Dot type') }}</legend>
                <div class="radio" v-for="type in ['dot', 'square']" :key="type">
                  <input
                    :id="'cornersDotOptionsType-' + type"
                    type="radio"
                    v-model="cornersDotOptionsType"
                    :value="type"
                  />
                  <label :for="'cornersDotOptionsType-' + type">{{ t(type) }}</label>
                </div>
              </fieldset>
              <fieldset class="flex-1" role="radio" tabindex="0">
                <div class="flex flex-row items-center gap-2">
                  <legend>{{ t('Error correction level') }}</legend>
                  <a
                    href="https://docs.uniqode.com/en/articles/7219782-what-is-the-recommended-error-correction-level-for-printing-a-qr-code"
                    target="_blank"
                    class="icon-button flex flex-row items-center"
                    :aria-label="t('What is error correction level?')"
                  >
                    <svg
                      class="me-1"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="#888888"
                        d="M11.95 18q.525 0 .888-.363t.362-.887t-.362-.888t-.888-.362t-.887.363t-.363.887t.363.888t.887.362m.05 4q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m.1-12.3q.625 0 1.088.4t.462 1q0 .55-.337.975t-.763.8q-.575.5-1.012 1.1t-.438 1.35q0 .35.263.588t.612.237q.375 0 .638-.25t.337-.625q.1-.525.45-.937t.75-.788q.575-.55.988-1.2t.412-1.45q0-1.275-1.037-2.087T12.1 6q-.95 0-1.812.4T8.975 7.625q-.175.3-.112.638t.337.512q.35.2.725.125t.625-.425q.275-.375.688-.575t.862-.2"
                      />
                    </svg>
                  </a>
                </div>
                <div v-for="level in errorCorrectionLevels" class="radio" :key="level">
                  <input
                    :id="'errorCorrectionLevel-' + level"
                    type="radio"
                    v-model="errorCorrectionLevel"
                    :value="level"
                    :aria-describedby="
                      level === recommendedErrorCorrectionLevel ? 'recommended-text' : undefined
                    "
                  />
                  <div class="flex items-center gap-2">
                    <label :for="'errorCorrectionLevel-' + level">{{
                      t(ERROR_CORRECTION_LEVEL_LABELS[level])
                    }}</label>
                    <span
                      v-if="level === recommendedErrorCorrectionLevel"
                      class="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                    >
                      {{ t('Suggested') }}
                    </span>
                  </div>
                </div>
              </fieldset>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>

  <DataTemplatesModal
    :show="isDataModalVisible"
    :initial-data="data"
    @close="closeDataModal"
    @update:data="updateDataFromModal"
  />

  <!-- Fallback modal for manual copy in Safari -->
  <CopyImageModal
    v-if="showSafariCopyImageModal"
    :is-loading="copyModalIsLoading"
    :image-src="copyModalImageSrc"
    @close="closeCopyModal"
  />
</template>

<style scoped>
/* Custom styling for touch-friendly range sliders */
#size[type='range'],
#border-radius[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  height: 12px;
  border-radius: 6px;
  background: #e5e7eb;
  outline: none;
  transition: background 0.3s;
}

#size[type='range']::-webkit-slider-thumb,
#border-radius[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

#size[type='range']::-webkit-slider-thumb:hover,
#border-radius[type='range']::-webkit-slider-thumb:hover {
  background: #2563eb;
  transform: scale(1.1);
}

#size[type='range']::-webkit-slider-thumb:active,
#border-radius[type='range']::-webkit-slider-thumb:active {
  transform: scale(1.2);
}

/* Firefox */
#size[type='range']::-moz-range-thumb,
#border-radius[type='range']::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

#size[type='range']::-moz-range-thumb:hover,
#border-radius[type='range']::-moz-range-thumb:hover {
  background: #2563eb;
  transform: scale(1.1);
}

#size[type='range']::-moz-range-thumb:active,
#border-radius[type='range']::-moz-range-thumb:active {
  transform: scale(1.2);
}

#size[type='range']::-moz-range-track,
#border-radius[type='range']::-moz-range-track {
  height: 12px;
  border-radius: 6px;
  background: #e5e7eb;
  border: none;
}

/* Dark mode support */
.dark #size[type='range'],
.dark #border-radius[type='range'] {
  background: #4b5563;
}

.dark #size[type='range']::-webkit-slider-thumb,
.dark #border-radius[type='range']::-webkit-slider-thumb {
  background: #60a5fa;
  border-color: #1f2937;
}

.dark #size[type='range']::-webkit-slider-thumb:hover,
.dark #border-radius[type='range']::-webkit-slider-thumb:hover {
  background: #3b82f6;
}

.dark #size[type='range']::-moz-range-thumb,
.dark #border-radius[type='range']::-moz-range-thumb {
  background: #60a5fa;
  border-color: #1f2937;
}

.dark #size[type='range']::-moz-range-thumb:hover,
.dark #border-radius[type='range']::-moz-range-thumb:hover {
  background: #3b82f6;
}

.dark #size[type='range']::-moz-range-track,
.dark #border-radius[type='range']::-moz-range-track {
  background: #4b5563;
  height: 12px;
  border-radius: 6px;
}
</style>
