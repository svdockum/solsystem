<template>
  <div class="fixed inset-0 overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center">
      <div class="w-10 h-10 border-2 border-sun/30 border-t-sun rounded-full animate-spin" />
    </div>

    <!-- 3D Scene (full screen) -->
    <ClientOnly>
      <SolarScene
        v-if="sun"
        :attendees="attendeesStore.attendees"
      />
    </ClientOnly>

    <!-- Attendee Panel overlay (right side) -->
    <div
      v-if="sun"
      class="absolute top-0 right-0 h-full z-10 p-4"
    >
      <AttendeePanel
        :sun-name="sun.name"
        :sun-slug="sun.slug"
        :attendees="attendeesStore.attendees"
      />
    </div>

    <!-- Top-left: sun name + back link -->
    <div v-if="sun" class="absolute top-4 left-4 z-10">
      <NuxtLink
        to="/"
        class="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
      >
        ← All Suns
      </NuxtLink>
      <h1 class="text-white font-bold text-xl mt-1 sun-glow-text">{{ sun.name }}</h1>
    </div>

    <!-- Leave button (bottom-left, only when joined) -->
    <div v-if="sun && hasToken" class="absolute bottom-4 left-4 z-10">
      <button class="btn-ghost text-sm opacity-60 hover:opacity-100" @click="handleLeave">
        Leave orbit
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Sun } from '~/types'
import SolarScene from '~/components/scene/SolarScene.vue'

definePageMeta({ layout: 'default' })

const route = useRoute()
const slug = route.params.slug as string

const supabase = useSupabase()
const attendeesStore = useAttendeesStore()

const sun = ref<Sun | null>(null)
const loading = ref(true)
const hasToken = ref(false)

const sunId = computed(() => sun.value?.id ?? '')
const sunSlug = computed(() => sun.value?.slug ?? '')

const { leave } = useHeartbeat(sunId, sunSlug)

onMounted(async () => {
  const { data } = await supabase
    .from('suns')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  sun.value = data as Sun | null
  loading.value = false

  if (sun.value) {
    hasToken.value = !!sessionStorage.getItem(`solsystem_token_${sun.value.id}`)
    await attendeesStore.fetchAttendees(sun.value.id)
    attendeesStore.subscribeToSun(sun.value.id)
  }
})

onUnmounted(() => {
  attendeesStore.unsubscribe()
})

async function handleLeave() {
  await leave()
  await navigateTo('/')
}
</script>
