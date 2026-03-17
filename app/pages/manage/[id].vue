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

        <ul v-else class="space-y-2 max-h-80 overflow-y-auto pr-1">
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
            <span class="text-xs text-white/30 font-mono flex-shrink-0">
              {{ formatDate(attendee.joined_at) }}
            </span>
            <button
              class="text-white/20 hover:text-red-400 transition-colors text-xs flex-shrink-0 px-1"
              title="Remove planet"
              @click="promptRemove(attendee.id, attendee.username)"
            >
              ✕
            </button>
          </li>
        </ul>
      </div>

      <!-- Danger zone -->
      <div class="glass-panel p-6 border-red-500/20">
        <h2 class="text-lg font-semibold text-red-400 mb-2">Danger zone</h2>
        <p class="text-sm text-white/40 mb-4">
          Deactivating a Sun removes it from the directory and disconnects all planets.
        </p>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
            :disabled="deactivating || deleting"
            @click="modal = 'deactivate'"
          >
            {{ deactivating ? 'Deactivating...' : 'Deactivate this Sun' }}
          </button>
          <button
            class="px-4 py-2 rounded-lg border border-red-500/60 bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
            :disabled="deactivating || deleting"
            @click="modal = 'delete'"
          >
            {{ deleting ? 'Deleting...' : 'Delete this Sun' }}
          </button>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-16">
      <p class="text-white/40">Sun not found.</p>
    </div>
  </div>

  <!-- Remove attendee confirm -->
  <ConfirmModal
    :open="modal === 'remove-attendee'"
    title="Remove planet"
    :description="`Remove ${pendingRemoveName} from this orbit?`"
    confirm-label="Remove"
    danger
    @confirm="confirmRemove"
    @cancel="modal = null"
  />

  <!-- Deactivate confirm -->
  <ConfirmModal
    :open="modal === 'deactivate'"
    title="Deactivate this Sun"
    :description="`This removes &quot;${sun?.name}&quot; from the directory and disconnects all planets.`"
    confirm-label="Deactivate"
    danger
    @confirm="handleDeactivate"
    @cancel="modal = null"
  />

  <!-- Delete confirm -->
  <ConfirmModal
    :open="modal === 'delete'"
    title="Delete this Sun"
    :description="`Permanently delete &quot;${sun?.name}&quot;? This cannot be undone.`"
    confirm-label="Delete"
    danger
    @confirm="handleDelete"
    @cancel="modal = null"
  />
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
const deleting = ref(false)

const modal = ref<'remove-attendee' | 'deactivate' | 'delete' | null>(null)
const pendingRemoveId = ref<string | null>(null)
const pendingRemoveName = ref('')

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

function promptRemove(attendeeId: string, username: string) {
  pendingRemoveId.value = attendeeId
  pendingRemoveName.value = username
  modal.value = 'remove-attendee'
}

async function confirmRemove() {
  if (!pendingRemoveId.value) return
  modal.value = null
  await attendeesStore.removeAttendee(pendingRemoveId.value)
  pendingRemoveId.value = null
}

async function handleDelete() {
  if (!sun.value) return
  modal.value = null
  deleting.value = true
  try {
    await sunStore.deleteSun(sun.value.id)
    await navigateTo('/')
  } finally {
    deleting.value = false
  }
}

async function handleDeactivate() {
  if (!sun.value) return
  modal.value = null
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
