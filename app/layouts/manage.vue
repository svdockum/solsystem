<template>
  <div class="min-h-screen bg-space-950 text-white">
    <!-- Nav -->
    <nav class="border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <span class="text-2xl">☀️</span>
        <span class="hidden sm:inline font-bold text-lg sun-glow-text group-hover:opacity-80 transition-opacity">
          SolSystem
        </span>
      </NuxtLink>
      <div class="flex items-center gap-2">
        <NuxtLink to="/" class="btn-ghost text-sm whitespace-nowrap">
          All Suns
        </NuxtLink>
        <NuxtLink to="/scan" class="btn-ghost text-sm whitespace-nowrap">
          Scanner
        </NuxtLink>
        <button v-if="auth.user" class="btn-ghost text-sm whitespace-nowrap" @click="handleSignOut">
          Log out
        </button>
      </div>
    </nav>

    <!-- Content -->
    <main class="max-w-3xl mx-auto px-6 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore()

async function handleSignOut() {
  await auth.signOut()
  await navigateTo('/login')
}
</script>
