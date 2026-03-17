<template>
  <div class="flex flex-col items-center gap-4">
    <div v-if="qrDataUrl" class="bg-white p-3 rounded-xl shadow-lg">
      <img :src="qrDataUrl" :alt="`QR code to join ${sunSlug}`" class="w-48 h-48 block" />
    </div>
    <div v-else class="w-48 h-48 bg-white/5 rounded-xl animate-pulse" />

    <div class="text-center">
      <p class="text-xs text-white/50 mb-1">Scan to join or share link:</p>
      <a
        :href="joinUrl"
        target="_blank"
        class="text-xs text-sun/80 hover:text-sun break-all font-mono transition-colors"
      >
        {{ joinUrl }}
      </a>
    </div>

    <button
      class="btn-ghost text-sm"
      :disabled="!qrDataUrl"
      @click="downloadQr"
    >
      Download QR
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  sunSlug: string
  sunName: string
}>()

const { generateDataUrl, getJoinUrl } = useQrCode()
const qrDataUrl = ref('')
const joinUrl = computed(() => getJoinUrl(props.sunSlug))

onMounted(async () => {
  qrDataUrl.value = await generateDataUrl(props.sunSlug)
})

watch(() => props.sunSlug, async (slug) => {
  qrDataUrl.value = await generateDataUrl(slug)
})

function downloadQr() {
  if (!qrDataUrl.value) return
  const a = document.createElement('a')
  a.href = qrDataUrl.value
  a.download = `solsystem-${props.sunSlug}-qr.png`
  a.click()
}
</script>
