<script setup lang="ts">
import LanguageSelector from '@/components/LanguageSelector.vue'
import MobileMenu from '@/components/MobileMenu.vue'
import QRCodeCreate from '@/components/QRCodeCreate.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import forceLightMode from '@/utils/forceLightMode'

const { t } = useI18n()

const capturedData = ref<string>('')

// #region Scroll-aware header
const lastScrollTop = ref(0)
const isHeaderCollapsed = ref(false)
const scrollThreshold = 50 // Scroll threshold to trigger header collapse

const handleScroll = () => {
  const currentScrollTop = document.querySelector('#app')?.scrollTop
  if (!currentScrollTop) return

  // Determine scroll direction and distance
  if (currentScrollTop > lastScrollTop.value && currentScrollTop > scrollThreshold) {
    // Scrolling down past threshold
    isHeaderCollapsed.value = true
  } else if (currentScrollTop < lastScrollTop.value || currentScrollTop < scrollThreshold) {
    // Scrolling up or at top
    isHeaderCollapsed.value = false
  }

  lastScrollTop.value = currentScrollTop
}

onMounted(() => {
  document.querySelector('#app')?.addEventListener('scroll', handleScroll)
  forceLightMode()
})

onUnmounted(() => {
  document.querySelector('#app')?.removeEventListener('scroll', handleScroll)
})
// #endregion

// App is now permanently in Create mode
</script>

<template>
  <main>
    <!-- Desktop header - only visible on desktop -->
    <div
      class="hidden md:mx-auto md:mb-4 md:mt-8 md:flex md:w-5/6 md:flex-row md:justify-between md:ps-4"
    >
      <div class="flex items-center">
        <h1 class="text-3xl text-gray-700 dark:text-gray-100">QR Code Generator</h1>
      </div>

      <div class="flex items-center justify-end gap-2">
        <LanguageSelector />
      </div>
    </div>

    <!-- Mobile sticky header - only visible on mobile -->
    <div
      class="scroll-header-container fixed inset-x-0 top-0 z-50 md:hidden"
      :class="{ 'header-collapsed': isHeaderCollapsed }"
    >
      <div class="flex justify-center">
        <div
          class="relative flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-100 p-1 shadow-lg transition-all duration-300 dark:border-zinc-700 dark:bg-zinc-800 dark:shadow-slate-800"
        >
          <!-- App title for mobile -->
          <div class="flex items-center gap-2 px-2 py-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              :width="isHeaderCollapsed ? 14 : 18"
              :height="isHeaderCollapsed ? 14 : 18"
              viewBox="0 0 24 24"
              class="text-zinc-700 dark:text-zinc-200"
            >
              <path
                fill="currentColor"
                d="M3 11h8V3H3zm2-6h4v4H5zM3 21h8v-8H3zm2-6h4v4H5zm8-12v8h8V3zm6 6h-4V5h4zm-6 12h8v-8h-8zm2-6h4v4h-4z"
              />
            </svg>
            <span
              :class="isHeaderCollapsed ? 'text-xs' : 'text-sm'"
              class="font-medium text-zinc-700 dark:text-zinc-200"
              >QR Code Generator</span
            >
          </div>

          <!-- Hamburger menu -->
          <MobileMenu />
        </div>
      </div>
    </div>

    <div
      class="relative grid min-h-screen place-items-center items-start bg-white p-8 pt-16 dark:bg-zinc-900 md:px-6 md:pt-8"
    >
      <!-- Main content area - always showing create mode -->
      <div class="w-full lg:w-5/6">
        <QRCodeCreate :initial-data="capturedData" />
      </div>
    </div>
  </main>
</template>

<style lang="postcss" scoped>
.vertical-border {
  @apply h-8 bg-slate-300 dark:bg-slate-700 w-1;
}

.icon-button {
  @apply p-1;
  @apply outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-200 hover:shadow rounded-sm;
  @apply text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800;
}

.button {
  @apply bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200;
  @apply shadow-sm hover:shadow p-2 focus-visible:shadow-md rounded-lg;
  @apply outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-200;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

/* Scroll-aware header styles */
.scroll-header-container {
  transition: transform 0.3s ease;
}

.header-collapsed {
  transform: translateY(-40%);
}

.header-collapsed button {
  transition: all 0.3s ease;
}
</style>
