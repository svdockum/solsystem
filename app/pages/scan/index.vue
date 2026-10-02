<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-3xl font-bold sun-glow-text">Scanner</h1>
      <p class="text-white/50 mt-1">Start a new session or reopen an earlier one.</p>
    </div>

    <!-- New session -->
    <form class="glass-panel p-5 space-y-3" @submit.prevent="handleCreate">
      <label class="block text-sm font-medium text-white/70" for="session-name">New session</label>
      <input
        id="session-name"
        v-model="name"
        type="text"
        class="input-field"
        placeholder="e.g. Maths 3B, Monday 1st period"
        maxlength="80"
        required
      />
      <p v-if="error" class="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{{ error }}</p>
      <button type="submit" class="btn-primary w-full py-3 text-base font-semibold" :disabled="creating || !name.trim()">
        {{ creating ? 'Creating...' : 'Start scanning' }}
      </button>
    </form>

    <!-- Existing sessions -->
    <div>
      <h2 class="text-sm uppercase tracking-widest text-white/30 mb-3 font-medium">Your sessions</h2>

      <div v-if="sunStore.loading" class="flex justify-center py-8">
        <div class="w-8 h-8 border-2 border-sun/30 border-t-sun rounded-full animate-spin" />
      </div>

      <p v-else-if="sunStore.error" class="text-red-400 text-sm">{{ sunStore.error }}</p>

      <p v-else-if="sunStore.activeSuns.length === 0" class="text-white/30 text-sm">
        No sessions yet.
      </p>

      <ul v-else class="space-y-2">
        <li v-for="sun in sunStore.activeSuns" :key="sun.id">
          <NuxtLink
            :to="`/scan/${sun.id}`"
            class="glass-panel px-4 py-3 flex items-center gap-3 hover:border-white/20 transition-colors"
          >
            <div class="flex-1 min-w-0">
              <p class="font-semibold truncate">{{ sun.name }}</p>
              <p class="text-xs text-white/40 font-mono">{{ formatDateTime(sun.created_at) }}</p>
            </div>
            <span class="text-white/40">→</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'manage', middleware: 'auth' })

const sunStore = useSunStore()

const name = ref('')
const creating = ref(false)
const error = ref('')

onMounted(() => sunStore.fetchAll())

async function handleCreate() {
  error.value = ''
  creating.value = true
  try {
    const sun = await sunStore.create({ name: name.value.trim() })
    await navigateTo(`/scan/${sun.id}`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Could not create the session'
  } finally {
    creating.value = false
  }
}
</script>
