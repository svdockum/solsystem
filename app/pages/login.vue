<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
    <!-- Background glow -->
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10"
      style="background: radial-gradient(circle, #FDB813, transparent 70%)"
    />

    <div class="relative w-full max-w-sm">
      <div class="text-center mb-8">
        <span class="text-5xl">☀️</span>
        <h1 class="sun-glow-text text-2xl font-bold mt-2">SolSystem</h1>
      </div>

      <div class="glass-panel p-6 space-y-5">
        <div>
          <h2 class="text-xl font-bold text-white">
            {{ mode === 'sign-in' ? 'Teacher login' : 'Create teacher account' }}
          </h2>
          <p class="text-sm text-white/50 mt-1">
            Sessions and scanned student numbers are only visible to you.
          </p>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium text-white/70 mb-1.5" for="login-email">Email</label>
            <input
              id="login-email"
              v-model="form.email"
              type="email"
              class="input-field"
              autocomplete="email"
              required
              autofocus
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-white/70 mb-1.5" for="login-password">Password</label>
            <input
              id="login-password"
              v-model="form.password"
              type="password"
              class="input-field"
              :autocomplete="mode === 'sign-in' ? 'current-password' : 'new-password'"
              minlength="8"
              required
            />
          </div>

          <p v-if="error" class="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
            {{ error }}
          </p>
          <p v-if="notice" class="text-sm text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">
            {{ notice }}
          </p>

          <button type="submit" class="btn-primary w-full py-3 text-base font-semibold" :disabled="loading">
            <span v-if="loading">One moment...</span>
            <span v-else>{{ mode === 'sign-in' ? 'Log in' : 'Create account' }}</span>
          </button>
        </form>

        <button class="text-sm text-white/50 hover:text-white transition-colors w-full text-center" @click="toggleMode">
          {{ mode === 'sign-in' ? 'No account yet? Create one' : 'Already have an account? Log in' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const auth = useAuthStore()

const mode = ref<'sign-in' | 'sign-up'>('sign-in')
const form = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')
const notice = ref('')

// Only follow redirects to pages of this site
const redirectTo = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/'
})

onMounted(() => {
  if (auth.user) navigateTo(redirectTo.value)
})

function toggleMode() {
  mode.value = mode.value === 'sign-in' ? 'sign-up' : 'sign-in'
  error.value = ''
  notice.value = ''
}

async function handleSubmit() {
  error.value = ''
  notice.value = ''
  loading.value = true
  try {
    if (mode.value === 'sign-in') {
      await auth.signIn(form.email.trim(), form.password)
    } else {
      const needsConfirmation = await auth.signUp(form.email.trim(), form.password)
      if (needsConfirmation) {
        notice.value = 'Check your inbox to confirm your email address, then log in.'
        mode.value = 'sign-in'
        return
      }
    }
    await navigateTo(redirectTo.value)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
