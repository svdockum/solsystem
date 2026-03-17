<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div>
      <label class="block text-sm font-medium text-white/70 mb-1.5">
        Username <span class="text-red-400">*</span>
      </label>
      <input
        v-model="form.username"
        type="text"
        class="input-field"
        placeholder="Enter your name"
        maxlength="40"
        required
        autofocus
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-white/70 mb-1.5">
        Email <span class="text-white/30">(optional)</span>
      </label>
      <input
        v-model="form.email"
        type="email"
        class="input-field"
        placeholder="you@example.com"
      />
    </div>

    <p v-if="error" class="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
      {{ error }}
    </p>

    <button
      type="submit"
      class="btn-primary w-full py-3 text-base font-semibold"
      :disabled="loading || !form.username.trim()"
    >
      <span v-if="loading">Joining orbit...</span>
      <span v-else>Join the orbit</span>
    </button>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  sunId: string
  sunSlug: string
}>()

const emit = defineEmits<{
  joined: []
}>()

const { join } = useJoin()

const form = reactive({ username: '', email: '' })
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const result = await join({
      sun_id: props.sunId,
      username: form.username.trim(),
      email: form.email.trim() || undefined,
    })
    // Save session token
    sessionStorage.setItem(`solsystem_token_${props.sunId}`, result.sessionToken)
    emit('joined')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Could not join. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
