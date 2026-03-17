<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <div class="relative glass-panel w-full max-w-md p-6 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Create a new Sun</h2>
            <button class="text-white/40 hover:text-white transition-colors" @click="$emit('close')">
              ✕
            </button>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">
                Event name <span class="text-red-400">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                class="input-field"
                placeholder="e.g. Team Standup, Conference 2026"
                maxlength="80"
                required
                autofocus
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-white/70 mb-1.5">
                Description <span class="text-white/30">(optional)</span>
              </label>
              <textarea
                v-model="form.description"
                class="input-field resize-none"
                rows="2"
                placeholder="What's this Sun for?"
                maxlength="200"
              />
            </div>

            <p v-if="error" class="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
              {{ error }}
            </p>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="btn-ghost flex-1"
                @click="$emit('close')"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn-primary flex-1"
                :disabled="loading || !form.name.trim()"
              >
                <span v-if="loading">Creating...</span>
                <span v-else>Create Sun</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  created: [id: string]
}>()

const sunStore = useSunStore()
const form = reactive({ name: '', description: '' })
const loading = ref(false)
const error = ref('')

watch(() => props.open, (v) => {
  if (v) {
    form.name = ''
    form.description = ''
    error.value = ''
  }
})

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const sun = await sunStore.create({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
    })
    emit('created', sun.id)
    emit('close')
  } catch (e: unknown) {
    console.error('[SunCreateModal] create failed:', e)
    error.value = e instanceof Error ? e.message : 'Failed to create sun'
  } finally {
    loading.value = false
  }
}
</script>
