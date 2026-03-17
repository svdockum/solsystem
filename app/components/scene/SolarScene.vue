<template>
  <div ref="containerRef" class="solar-canvas-container" />
</template>

<script setup lang="ts">
import type { Attendee } from '~/types'
import { useSolarScene } from './useSolarScene'
import { usePlanetMeshes } from './usePlanetMeshes'

const props = defineProps<{
  attendees: Attendee[]
}>()

const containerRef = ref<HTMLElement | null>(null)
const attendeesRef = toRef(props, 'attendees')

const ctx = useSolarScene(containerRef)
usePlanetMeshes(ctx, attendeesRef)
</script>

<style scoped>
.solar-canvas-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.solar-canvas-container :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
