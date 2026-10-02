<template>
  <div class="fixed inset-0 flex flex-col bg-space-950 text-white select-none">
    <!-- Bright full-screen flash on every scan -->
    <div v-if="flashKey" :key="flashKey" class="scan-flash" @animationend="flashKey = 0" />

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="w-10 h-10 border-2 border-sun/30 border-t-sun rounded-full animate-spin" />
    </div>

    <div v-else-if="!sun" class="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p class="text-white/50">Session not found.</p>
      <NuxtLink to="/scan" class="btn-ghost text-sm">← All sessions</NuxtLink>
    </div>

    <template v-else>
      <!-- Header: session name + enter / leave switch -->
      <header class="flex items-center gap-3 px-3 py-2 border-b border-white/10 flex-shrink-0">
        <NuxtLink to="/scan" class="text-white/50 hover:text-white px-1 text-lg" title="All sessions">←</NuxtLink>
        <p class="flex-1 min-w-0 font-semibold truncate">{{ sun.name }}</p>

        <div class="flex rounded-lg border border-white/15 overflow-hidden text-sm font-semibold flex-shrink-0" role="group" aria-label="Scan mode">
          <button
            class="px-4 py-2 transition-colors"
            :class="mode === 'enter' ? 'bg-green-500 text-black' : 'text-white/50'"
            :aria-pressed="mode === 'enter'"
            @click="setMode('enter')"
          >
            Enter
          </button>
          <button
            class="px-4 py-2 transition-colors"
            :class="mode === 'leave' ? 'bg-orange-500 text-black' : 'text-white/50'"
            :aria-pressed="mode === 'leave'"
            @click="setMode('leave')"
          >
            Leave
          </button>
        </div>
      </header>

      <!-- Camera -->
      <div class="relative flex-1 min-h-0 bg-black overflow-hidden">
        <video
          ref="videoRef"
          class="w-full h-full object-cover"
          :class="scanner.facing.value === 'user' ? '-scale-x-100' : ''"
          playsinline
          muted
          autoplay
        />

        <!-- Aiming line -->
        <div
          v-if="scanner.active.value"
          class="absolute left-[8%] right-[8%] top-1/2 h-0.5 rounded-full pointer-events-none"
          :class="mode === 'enter' ? 'bg-green-400/80' : 'bg-orange-400/80'"
        />

        <div
          v-if="scanner.error.value || scanner.starting.value"
          class="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center bg-black/80"
        >
          <template v-if="scanner.error.value">
            <p class="text-red-400 text-sm">{{ scanner.error.value }}</p>
            <button class="btn-primary" @click="scanner.start()">Try again</button>
          </template>
          <p v-else class="text-white/50 text-sm">Starting camera...</p>
        </div>

        <button
          class="absolute top-3 right-3 glass-panel px-3 py-2 text-xs text-white/80"
          title="Switch between rear and front camera"
          @click="scanner.flip()"
        >
          Flip camera
        </button>
      </div>

      <!-- Answer panel: belongs to the most recent scan; the next scan replaces it -->
      <section class="flex-shrink-0 px-4 pt-4 pb-3 min-h-[15.5rem] flex flex-col justify-center border-t border-white/10">
        <div v-if="!current" class="text-center">
          <p class="text-lg font-semibold">Show your barcode to the camera</p>
          <p class="text-sm text-white/40 mt-1">
            {{ mode === 'enter' ? 'Scanning students in' : 'Scanning students out' }}
          </p>
        </div>

        <div v-else class="space-y-3">
          <div class="flex items-baseline justify-between gap-3">
            <p class="font-mono text-3xl font-bold truncate">{{ current.studentNumber }}</p>
            <p class="text-xs flex-shrink-0" :class="current.direction === 'enter' ? 'text-green-400' : 'text-orange-400'">
              <template v-if="current.scan">
                {{ current.direction === 'enter' ? 'In' : 'Out' }} · {{ formatTime(current.scan.scanned_at) }}
              </template>
              <template v-else-if="!current.error">Saving...</template>
            </p>
          </div>

          <p v-if="current.error" class="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
            {{ current.error }}
          </p>

          <!-- Thank you -->
          <div v-else-if="currentAnswer && !current.editing" class="text-center py-2">
            <p class="text-5xl leading-none">{{ currentAnswer.emoji }}</p>
            <p class="text-xl font-bold mt-2">Thank you!</p>
            <p class="text-sm text-white/50">{{ currentAnswer.label }}</p>
            <button class="btn-ghost text-sm mt-3" @click="current.editing = true">
              ← Change my answer
            </button>
          </div>

          <!-- Enter: mood -->
          <div v-else-if="current.direction === 'enter'">
            <p class="text-sm text-white/60 mb-2">How is your energy?</p>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="option in MOOD_OPTIONS"
                :key="option.value"
                class="answer-button"
                :class="{ 'answer-button-selected': current.scan?.mood === option.value }"
                :disabled="!current.scan"
                @click="answer({ mood: option.value })"
              >
                <span class="text-4xl leading-none">{{ option.emoji }}</span>
                <span class="text-sm font-medium">{{ option.label }}</span>
              </button>
            </div>
          </div>

          <!-- Leave: rating -->
          <div v-else>
            <p class="text-sm text-white/60 mb-2">How good was it?</p>
            <div class="grid grid-cols-6 gap-2">
              <button
                v-for="(option, i) in RATING_OPTIONS"
                :key="option.value"
                class="answer-button"
                :class="[
                  i < 3 ? 'col-span-2' : 'col-span-3',
                  { 'answer-button-selected': current.scan?.rating === option.value },
                ]"
                :disabled="!current.scan"
                @click="answer({ rating: option.value })"
              >
                <span class="text-3xl leading-none">{{ option.emoji }}</span>
                <span class="text-xs font-medium">{{ option.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer: counts + list -->
      <footer class="footer-safe flex items-center justify-between gap-3 px-4 pt-2 border-t border-white/10 flex-shrink-0">
        <p class="text-sm text-white/60">
          <span class="text-green-400 font-semibold">{{ scansStore.enterCount }}</span> in
          <span class="mx-1 text-white/20">·</span>
          <span class="text-orange-400 font-semibold">{{ scansStore.leaveCount }}</span> out
        </p>
        <button class="btn-ghost text-sm" @click="listOpen = true">
          List ({{ scansStore.byStudent.length }})
        </button>
      </footer>

      <!-- Scanned list (scanning is paused while it is open) -->
      <Transition name="fade">
        <div v-if="listOpen" class="fixed inset-0 z-40 flex flex-col bg-space-950">
          <header class="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
            <div class="flex-1 min-w-0">
              <p class="font-semibold truncate">{{ sun.name }}</p>
              <p class="text-xs text-white/40">
                {{ scansStore.byStudent.length }} {{ scansStore.byStudent.length === 1 ? 'student' : 'students' }} scanned
              </p>
            </div>
            <button class="btn-primary text-sm" @click="listOpen = false">Back to scanner</button>
          </header>

          <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4 select-text">
            <!-- For cards that will not scan -->
            <form class="flex gap-2" @submit.prevent="handleManual">
              <input
                v-model="manualNumber"
                type="text"
                inputmode="numeric"
                class="input-field"
                maxlength="32"
                placeholder="Type a student number"
              />
              <button type="submit" class="btn-ghost flex-shrink-0" :disabled="!manualNumber.trim()">
                {{ mode === 'enter' ? 'Add in' : 'Add out' }}
              </button>
            </form>

            <ScanList :rows="scansStore.byStudent" @remove="pendingRemove = $event" />
          </div>
        </div>
      </Transition>
    </template>

    <ConfirmModal
      :open="!!pendingRemove"
      title="Remove student"
      :description="`Remove ${pendingRemove} from this session? Their scan times and answers are deleted.`"
      confirm-label="Remove"
      danger
      @confirm="confirmRemove"
      @cancel="pendingRemove = null"
    />
  </div>
</template>

<script setup lang="ts">
import type { Mood, Rating, Scan, ScanDirection } from '~/types'

definePageMeta({ layout: 'default', middleware: 'auth' })

interface CurrentScan {
  seq: number
  studentNumber: string
  direction: ScanDirection
  scan: Scan | null // null while saving
  error: string
  editing: boolean  // back from the thank-you screen to change the answer
}

const route = useRoute()
const id = route.params.id as string

const sunStore = useSunStore()
const scansStore = useScansStore()

const sun = computed(() => sunStore.current)
const loading = ref(true)
const mode = ref<ScanDirection>('enter')

const videoRef = ref<HTMLVideoElement | null>(null)
const current = ref<CurrentScan | null>(null)
const flashKey = ref(0)
const listOpen = ref(false)
const manualNumber = ref('')
const pendingRemove = ref<string | null>(null)

let scanSeq = 0

const scanner = useBarcodeScanner(videoRef, handleScan)
const wakeLock = useWakeLock()

const currentAnswer = computed(() => {
  const scan = current.value?.scan
  if (!scan) return undefined
  return scan.direction === 'enter' ? moodOption(scan.mood) : ratingOption(scan.rating)
})

onMounted(async () => {
  await sunStore.fetchById(id)
  loading.value = false
  if (!sun.value) return

  mode.value = sun.value.scan_mode
  scansStore.fetchScans(sun.value.id)
  scansStore.subscribeToSun(sun.value.id)

  // Keep the phone awake while it is used as a scanner
  if (wakeLock.isSupported.value) wakeLock.request('screen').catch(() => {})

  await nextTick() // the <video> only exists once the sun is loaded
  await scanner.start()
})

onUnmounted(() => {
  scansStore.unsubscribe()
  wakeLock.release().catch(() => {})
})

watch(listOpen, (open) => {
  scanner.paused.value = open
})

async function handleScan(studentNumber: string) {
  if (!sun.value) return

  flashKey.value++
  navigator.vibrate?.(60)

  const seq = ++scanSeq
  const direction = mode.value
  current.value = { seq, studentNumber, direction, scan: null, error: '', editing: false }

  try {
    const scan = await scansStore.record(sun.value.id, studentNumber, direction)
    // A newer scan may have taken over the panel in the meantime
    if (current.value?.seq === seq) current.value.scan = scan
  } catch (e: unknown) {
    navigator.vibrate?.([80, 60, 80])
    if (current.value?.seq === seq) {
      current.value.error = `Not saved: ${e instanceof Error ? e.message : 'unknown error'}. Scan again.`
    }
    scanner.reset() // let the same card be scanned again right away
  }
}

async function answer(value: { mood: Mood } | { rating: Rating }) {
  const entry = current.value
  if (!entry?.scan) return

  // Show the thank-you screen right away; roll back if saving fails
  const previous = entry.scan
  entry.scan = { ...previous, ...value }
  entry.editing = false

  try {
    const saved = await scansStore.setAnswer(previous.id, value)
    if (current.value?.seq === entry.seq) current.value.scan = saved
  } catch (e: unknown) {
    if (current.value?.seq === entry.seq) {
      current.value.scan = previous
      current.value.error = `Answer not saved: ${e instanceof Error ? e.message : 'unknown error'}`
    }
  }
}

async function setMode(next: ScanDirection) {
  if (!sun.value || mode.value === next) return
  mode.value = next
  current.value = null
  scanner.reset()
  // Remember the switch position for when the session is reopened
  await sunStore.updateSettings(sun.value.id, { scan_mode: next }).catch(() => {})
}

async function handleManual() {
  const value = manualNumber.value.trim()
  if (!value) return
  manualNumber.value = ''
  listOpen.value = false
  await handleScan(value)
}

async function confirmRemove() {
  const studentNumber = pendingRemove.value
  pendingRemove.value = null
  if (!sun.value || !studentNumber) return
  await scansStore.removeStudent(sun.value.id, studentNumber)
  if (current.value?.studentNumber === studentNumber) current.value = null
  scanner.reset()
}
</script>

<style scoped>
.scan-flash {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: #fff;
  pointer-events: none;
  animation: scan-flash 0.55s ease-out forwards;
}

@keyframes scan-flash {
  0%, 35% { opacity: 1; }
  100% { opacity: 0; }
}

.answer-button {
  @apply flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-xl
    border border-white/15 bg-white/5 transition-all duration-150
    active:scale-95 active:bg-white/20 disabled:opacity-40;
}

.answer-button-selected {
  @apply border-sun bg-sun/20;
}

.footer-safe {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}
</style>
