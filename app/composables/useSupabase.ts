import type { SupabaseClient } from '@supabase/supabase-js'

export function useSupabase(): SupabaseClient {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$supabase as SupabaseClient
}
