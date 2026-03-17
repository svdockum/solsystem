<template>
  <div class="glass-panel p-5 flex flex-col gap-4 hover:border-white/20 transition-colors">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-white text-lg truncate">{{ sun.name }}</h3>
        <p v-if="sun.description" class="text-sm text-white/50 mt-0.5 line-clamp-2">
          {{ sun.description }}
        </p>
        <p class="text-xs text-white/30 mt-1 font-mono">{{ sun.slug }}</p>
      </div>

      <!-- Live attendee count -->
      <span
        class="ml-3 flex-shrink-0 flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full"
        :class="(attendeeCount ?? 0) > 0 ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/30'"
      >
        <span
          v-if="(attendeeCount ?? 0) > 0"
          class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"
        />
        {{ attendeeCount }}
      </span>
    </div>

    <div class="flex gap-2">
      <NuxtLink :to="`/sun/${sun.slug}`" class="btn-primary flex-1 text-center text-sm py-2">
        View
      </NuxtLink>
      <NuxtLink :to="`/manage/${sun.id}`" class="btn-ghost flex-1 text-center text-sm py-2">
        Manage
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Sun } from '~/types'

const props = defineProps<{
  sun: Sun
  attendeeCount?: number
}>()
</script>
