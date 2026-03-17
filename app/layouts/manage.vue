<template>
  <div class="min-h-screen bg-space-950 text-white">
    <!-- Nav -->
    <nav class="border-b border-white/10 px-6 py-4 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <span class="text-2xl">☀️</span>
        <span class="font-bold text-lg sun-glow-text group-hover:opacity-80 transition-opacity">
          SolSystem
        </span>
      </NuxtLink>
      <NuxtLink to="/" class="btn-ghost text-sm">
        ← All Suns
      </NuxtLink>
    </nav>

    <!-- Content -->
    <main class="max-w-3xl mx-auto px-6 py-8">
      <slot />
    </main>
  </div>
</template>
