<template>
  <div class="glass-panel p-3 inline-flex flex-col gap-2">
    <div class="bg-white p-2 rounded-lg">
      <img
        v-if="qrDataUrl"
        :src="qrDataUrl"
        alt="QR code to join this Sun"
        class="block aspect-square"
        :style="{ width: qrWidth }"
      />
      <div v-else class="aspect-square bg-black/5 animate-pulse" :style="{ width: qrWidth }" />
    </div>

    <div class="flex items-center justify-between gap-2">
      <button
        class="qr-size-button"
        title="Make the QR code smaller"
        aria-label="Make the QR code smaller"
        :disabled="step <= 0"
        @click="step--"
      >
        −
      </button>
      <a
        :href="joinUrl"
        target="_blank"
        class="text-xs text-white/50 hover:text-white transition-colors truncate"
      >
        Scan to join
      </a>
      <button
        class="qr-size-button"
        title="Make the QR code bigger"
        aria-label="Make the QR code bigger"
        :disabled="step >= QR_SIZES.length - 1"
        @click="step++"
      >
        +
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  sunSlug: string
}>()

// Width steps in px for the − / + buttons
const QR_SIZES = [96, 144, 200, 280, 380, 500]

// Remembered per browser, so the wall screen keeps its size after a reload
const storedStep = useLocalStorage('solsystem_qr_size_step', 1)
const step = computed({
  get: () => Math.min(Math.max(storedStep.value, 0), QR_SIZES.length - 1),
  set: (value: number) => {
    storedStep.value = Math.min(Math.max(value, 0), QR_SIZES.length - 1)
  },
})

// Never taller or wider than the screen leaves room for
const qrWidth = computed(() => `min(${QR_SIZES[step.value]}px, 100vh - 13rem, 100vw - 4rem)`)

const { generateDataUrl, getJoinUrl } = useQrCode()
const qrDataUrl = ref('')
const joinUrl = computed(() => getJoinUrl(props.sunSlug))

// Rendered large so the biggest step stays sharp
watch(
  () => props.sunSlug,
  async (slug) => {
    qrDataUrl.value = await generateDataUrl(slug, 800)
  },
  { immediate: true },
)
</script>

<style scoped>
.qr-size-button {
  @apply w-8 h-8 flex items-center justify-center rounded-lg border border-white/20
    text-lg leading-none text-white/80 transition-colors
    hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent;
}
</style>
