<template>
  <div class="space-y-8">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-sun/30 border-t-sun rounded-full animate-spin" />
    </div>

    <template v-else-if="sun">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold sun-glow-text">{{ sun.name }}</h1>
          <p v-if="sun.description" class="text-white/50 mt-1">{{ sun.description }}</p>
          <p class="text-white/30 text-sm mt-1 font-mono">slug: {{ sun.slug }}</p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <NuxtLink :to="`/sun/${sun.slug}`" class="btn-primary text-sm" target="_blank">
            View live
          </NuxtLink>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div class="glass-panel p-4 text-center">
          <p class="text-3xl font-bold text-green-400">{{ attendeesStore.count }}</p>
          <p class="text-xs text-white/40 mt-1 uppercase tracking-wider">Planets orbiting</p>
        </div>
        <div class="glass-panel p-4 text-center">
          <p class="text-xs font-mono text-white/50 text-base break-all">{{ sun.slug }}</p>
          <p class="text-xs text-white/40 mt-1 uppercase tracking-wider">Slug</p>
        </div>
        <div class="glass-panel p-4 text-center sm:block hidden">
          <p class="text-sm text-white/70">{{ formatDate(sun.created_at) }}</p>
          <p class="text-xs text-white/40 mt-1 uppercase tracking-wider">Created</p>
        </div>
      </div>

      <!-- QR Code -->
      <div class="glass-panel p-6">
        <h2 class="text-lg font-semibold mb-6">QR Code</h2>
        <QrCodeDisplay :sun-slug="sun.slug" :sun-name="sun.name" />
      </div>

      <!-- Live attendees -->
      <div class="glass-panel p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Current planets</h2>
          <span class="text-sm text-white/40">Auto-refreshes live</span>
        </div>

        <div v-if="attendeesStore.count === 0" class="text-center py-8 text-white/30">
          No planets orbiting yet.
        </div>

        <ul v-else class="space-y-2">
          <li
            v-for="attendee in attendeesStore.sortedByJoined"
            :key="attendee.id"
            class="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5"
          >
            <span
              class="w-3 h-3 rounded-full flex-shrink-0"
              :style="{ backgroundColor: attendee.color }"
            />
            <span class="font-medium text-sm flex-1">{{ attendee.username }}</span>
            <span v-if="attendee.email" class="text-xs text-white/40">{{ attendee.email }}</span>
            <span class="text-xs text-white/30 font-mono">
              {{ formatDate(attendee.joined_at) }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Danger zone -->
      <div class="glass-panel p-6 border-red-500/20">
        <h2 class="text-lg font-semibold text-red-400 mb-2">Danger zone</h2>
        <p class="text-sm text-white/40 mb-4">
          Deactivating a Sun removes it from the directory and disconnects all planets.
        </p>
        <button
          class="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
          :disabled="deactivating"
          @click="handleDeactivate"
        >
          {{ deactivating ? 'Deactivating...' : 'Deactivate this Sun' }}
        </button>
      </div>
    </template>

    <div v-else class="text-center py-16">
      <p class="text-white/40">Sun not found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'manage' })

const route = useRoute()
const id = route.params.id as string

const sunStore = useSunStore()
const attendeesStore = useAttendeesStore()

const sun = computed(() => sunStore.current)
const loading = ref(true)
const deactivating = ref(false)

onMounted(async () => {
  await sunStore.fetchById(id)
  if (sun.value) {
    await attendeesStore.fetchAttendees(sun.value.id)
    attendeesStore.subscribeToSun(sun.value.id)
  }
  loading.value = false
})

onUnmounted(() => {
  attendeesStore.unsubscribe()
})

async function handleDeactivate() {
  if (!sun.value) return
  if (!confirm(`Are you sure you want to deactivate "${sun.value.name}"?`)) return
  deactivating.value = true
  try {
    await sunStore.deactivate(sun.value.id)
    await navigateTo('/')
  } finally {
    deactivating.value = false
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
