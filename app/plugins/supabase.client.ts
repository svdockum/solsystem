import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey,
  )

  // Restore the login session before any route middleware runs
  await useAuthStore().init(supabase)

  return {
    provide: {
      supabase,
    },
  }
})
