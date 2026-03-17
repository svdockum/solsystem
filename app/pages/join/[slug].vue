<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
    <!-- Background glow -->
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10"
      style="background: radial-gradient(circle, #FDB813, transparent 70%)"
    />

    <div class="relative w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-block">
          <span class="text-5xl">☀️</span>
        </NuxtLink>
        <h1 class="sun-glow-text text-2xl font-bold mt-2">SolSystem</h1>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="glass-panel p-8 text-center">
        <div class="w-8 h-8 border-2 border-sun/30 border-t-sun rounded-full animate-spin mx-auto mb-3" />
        <p class="text-white/50 text-sm">Loading Sun...</p>
      </div>

      <!-- Sun not found -->
      <div v-else-if="!sun" class="glass-panel p-8 text-center">
        <p class="text-white/60 mb-1">Sun not found</p>
        <p class="text-white/30 text-sm mb-5">This Sun may have ended or doesn't exist.</p>
        <NuxtLink to="/" class="btn-ghost text-sm">View all Suns</NuxtLink>
      </div>

      <!-- Idle message -->
      <div v-else-if="idleRedirect" class="glass-panel p-8 text-center">
        <p class="text-yellow-400 mb-2 text-sm">You were removed due to inactivity.</p>
        <p class="text-white/40 text-xs mb-5">Join again to re-enter the orbit.</p>
      </div>

      <!-- Already joined -->
      <div v-else-if="alreadyJoined" class="glass-panel p-8 text-center">
        <div class="text-3xl mb-3">🪐</div>
        <p class="font-semibold mb-1">You're already orbiting!</p>
        <p class="text-white/40 text-sm mb-5">{{ sun.name }}</p>
        <NuxtLink :to="`/sun/${sun.slug}`" class="btn-primary block text-center">
          Return to orbit
        </NuxtLink>
      </div>

      <!-- Join form -->
      <div v-else class="glass-panel p-6 space-y-5">
        <div>
          <p class="text-xs text-white/40 uppercase tracking-wider mb-0.5">Joining</p>
          <h2 class="text-xl font-bold text-white">{{ sun.name }}</h2>
          <p v-if="sun.description" class="text-sm text-white/50 mt-1">{{ sun.description }}</p>
        </div>

        <JoinForm
          :sun-id="sun.id"
          :sun-slug="sun.slug"
          @joined="onJoined"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Sun } from '~/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const slug = route.params.slug as string
const idleRedirect = route.query.idle === '1'

const supabase = useSupabase()
const sun = ref<Sun | null>(null)
const loading = ref(true)
const alreadyJoined = ref(false)

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
    const token = sessionStorage.getItem(`solsystem_token_${sun.value.id}`)
    if (token && !idleRedirect) {
      alreadyJoined.value = true
    }
  }
})

function onJoined() {
  if (sun.value) {
    navigateTo(`/sun/${sun.value.slug}`)
  }
}
</script>
