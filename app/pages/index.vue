<template>
  <div class="min-h-screen bg-space-950 overflow-auto">
    <!-- Hero -->
    <div class="text-center py-16 px-6 relative">
      <div
        class="absolute inset-0 opacity-20"
        style="background: radial-gradient(ellipse 60% 40% at 50% 50%, #FDB813 0%, transparent 70%)"
      />
      <div class="relative">
        <div class="text-6xl mb-4">☀️</div>
        <h1 class="text-5xl font-bold sun-glow-text mb-3">SolSystem</h1>
        <p class="text-white/50 text-lg max-w-md mx-auto">
          Create a session, scan student barcodes or share a QR code, and watch attendees become planets orbiting your Sun.
        </p>
        <div class="flex items-center justify-center gap-3 mt-8">
          <button class="btn-primary px-8 py-3 text-base" @click="showCreate = true">
            Create a Sun
          </button>
          <NuxtLink to="/scan" class="btn-ghost px-8 py-3 text-base">
            Open scanner
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Suns list -->
    <div class="max-w-4xl mx-auto px-6 pb-16">
      <div v-if="sunStore.loading" class="flex justify-center py-16">
        <div class="w-8 h-8 border-2 border-sun/30 border-t-sun rounded-full animate-spin" />
      </div>

      <div v-else-if="sunStore.error" class="text-center py-16">
        <p class="text-red-400">{{ sunStore.error }}</p>
        <button class="btn-ghost mt-4" @click="sunStore.fetchAll()">Retry</button>
      </div>

      <div v-else-if="sunStore.activeSuns.length === 0" class="text-center py-16">
        <p class="text-white/40 text-lg">No Suns yet.</p>
        <p class="text-white/25 text-sm mt-1">Create your first Sun to get started.</p>
      </div>

      <div v-else>
        <h2 class="text-sm uppercase tracking-widest text-white/30 mb-4 font-medium">
          Active Suns
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SunCard
            v-for="sun in sunStore.activeSuns"
            :key="sun.id"
            :sun="sun"
            :attendee-count="counts[sun.id] ?? 0"
          />
        </div>
      </div>
    </div>

    <SunCreateModal
      :open="showCreate"
      @close="showCreate = false"
      @created="(id) => navigateTo(`/manage/${id}`)"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'manage', middleware: 'auth' })

const sunStore = useSunStore()
const showCreate = ref(false)
const counts = ref<Record<string, number>>({})

const supabase = useSupabase()

onMounted(async () => {
  await sunStore.fetchAll()
  await loadCounts()
})

async function loadCounts() {
  if (!sunStore.activeSuns.length) return

  // Fetch attendee counts per sun in one query
  const { data } = await supabase
    .from('attendees')
    .select('sun_id')
    .in('sun_id', sunStore.activeSuns.map(s => s.id))

  const map: Record<string, number> = {}
  for (const row of data ?? []) {
    map[row.sun_id] = (map[row.sun_id] ?? 0) + 1
  }
  counts.value = map
}
</script>
