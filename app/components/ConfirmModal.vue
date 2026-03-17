<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="$emit('cancel')"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div class="relative glass-panel p-6 max-w-sm w-full space-y-4">
          <div>
            <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
            <p v-if="description" class="text-sm text-white/50 mt-1">{{ description }}</p>
          </div>
          <div class="flex gap-3 justify-end">
            <button class="btn-ghost text-sm" @click="$emit('cancel')">
              Cancel
            </button>
            <button
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="danger
                ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
                : 'btn-primary'"
              @click="$emit('confirm')"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .glass-panel,
.modal-leave-active .glass-panel {
  transition: transform 0.18s ease;
}
.modal-enter-from .glass-panel,
.modal-leave-to .glass-panel {
  transform: scale(0.95);
}
</style>
