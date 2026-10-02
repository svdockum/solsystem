<template>
  <div class="attendee-panel flex flex-col gap-2 pointer-events-none">

    <!-- ── Attendee list drawer ────────────────────────────── -->
    <div class="pointer-events-auto">
      <!-- Toggle button -->
      <button
        class="w-full glass-panel px-4 py-2.5 flex items-center justify-between
               hover:border-white/20 transition-all duration-200 group"
        @click="listOpen = !listOpen"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-white/80">{{ sunName }}</span>
          <span
            class="text-xs px-1.5 py-0.5 rounded-full font-mono"
            :class="count > 0 ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'"
          >
            {{ count }}
          </span>
        </div>
        <span
          class="text-white/40 text-xs transition-transform duration-300"
          :class="listOpen ? 'rotate-180' : ''"
        >▼</span>
      </button>

      <!-- Animated list panel -->
      <Transition name="drawer">
        <div v-if="listOpen" class="glass-panel mt-1 overflow-hidden">
          <ul class="max-h-64 overflow-y-auto py-2">
            <TransitionGroup name="slide-in" tag="div">
              <li
                v-for="attendee in sortedAttendees"
                :key="attendee.id"
                class="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
              >
                <span
                  class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: attendee.color, boxShadow: `0 0 6px ${attendee.color}80` }"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-white truncate">{{ attendee.username || 'Student' }}</p>
                </div>
                <span class="text-xs text-white/30 flex-shrink-0">{{ relativeTime(attendee.joined_at) }}</span>
              </li>
            </TransitionGroup>
            <li v-if="count === 0" class="px-3 py-6 text-center text-sm text-white/30">
              No planets yet
            </li>
          </ul>
        </div>
      </Transition>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { Attendee } from '~/types'

const props = defineProps<{
  sunName: string
  attendees: Attendee[]
}>()

const listOpen = ref(false)

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
  return hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d`
}
</script>

<style scoped>
.attendee-panel {
  width: 268px;
}

/* Drawer slide-down animation */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0 !important;
}

.drawer-enter-to,
.drawer-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 400px;
}
</style>
