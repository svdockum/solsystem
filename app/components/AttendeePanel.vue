<template>
  <aside class="attendee-panel glass-panel flex flex-col">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-white/10 flex-shrink-0">
      <div class="flex items-center justify-between mb-1">
        <h2 class="font-semibold text-sm tracking-wide text-white/80 uppercase">
          {{ sunName }}
        </h2>
        <span
          class="text-xs px-2 py-0.5 rounded-full font-mono"
          :class="count > 0 ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'"
        >
          {{ count }} {{ count === 1 ? 'planet' : 'planets' }}
        </span>
      </div>
      <p class="text-xs text-white/40">Orbiting the sun</p>
    </div>

    <!-- Attendee list -->
    <div class="flex-1 overflow-y-auto py-2 min-h-0">
      <TransitionGroup name="slide-in" tag="ul" class="space-y-0.5 px-2">
        <li
          v-for="attendee in sortedAttendees"
          :key="attendee.id"
          class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <span
            class="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/20"
            :style="{ backgroundColor: attendee.color, boxShadow: `0 0 8px ${attendee.color}80` }"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ attendee.username }}</p>
            <p v-if="attendee.email" class="text-xs text-white/40 truncate">{{ attendee.email }}</p>
          </div>
          <span class="text-xs text-white/30 flex-shrink-0">
            {{ relativeTime(attendee.joined_at) }}
          </span>
        </li>
      </TransitionGroup>

      <div v-if="count === 0" class="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div class="text-3xl mb-2 opacity-30">🪐</div>
        <p class="text-sm text-white/40">No planets yet</p>
        <p class="text-xs text-white/25 mt-1">Scan the QR code to join</p>
      </div>
    </div>

    <!-- Footer: QR code + join button -->
    <div class="px-4 py-4 border-t border-white/10 flex-shrink-0 space-y-3">
      <!-- QR code -->
      <div class="flex flex-col items-center">
        <div v-if="qrDataUrl" class="bg-white p-2 rounded-lg">
          <img :src="qrDataUrl" alt="QR code to join" class="w-36 h-36 block" />
        </div>
        <div v-else class="w-36 h-36 bg-white/5 rounded-lg animate-pulse" />
        <p class="text-xs text-white/30 mt-2 text-center break-all font-mono">
          {{ joinUrl }}
        </p>
      </div>

      <!-- Join button -->
      <NuxtLink
        :to="`/join/${sunSlug}`"
        class="btn-primary w-full text-center text-sm block"
        target="_blank"
      >
        Join this Sun
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { Attendee } from '~/types'

const props = defineProps<{
  sunName: string
  sunSlug: string
  attendees: Attendee[]
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

const count = computed(() => props.attendees.length)
const sortedAttendees = computed(() =>
  [...props.attendees].sort(
    (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
  ),
)

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}
</script>

<style scoped>
.attendee-panel {
  width: 280px;
  height: 100%;
}
</style>
