import { defineStore } from 'pinia'
import { createClient } from '@supabase/supabase-js'
import type { Sun, CreateSunPayload } from '~/types'

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'sun'
  const suffix = Date.now().toString(36)
  return `${base}-${suffix}`
}

// Get supabase client — works both in setup and store action contexts
function getClient() {
  const nuxtApp = useNuxtApp()
  if (nuxtApp.$supabase) return nuxtApp.$supabase as ReturnType<typeof createClient>
  // Fallback: create directly from runtime config (shouldn't normally happen)
  const config = useRuntimeConfig()
  return createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
}

export const useSunStore = defineStore('sun', {
  state: () => ({
    suns: [] as Sun[],
    current: null as Sun | null,
    loading: false,
    error: null as string | null,
  }),

  getters: {
    activeSuns: (state) => state.suns.filter(s => s.is_active),
  },

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const supabase = getClient()
        const { data, error } = await supabase
          .from('suns')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        this.suns = data as Sun[]
      } catch (e: unknown) {
        this.error = e instanceof Error ? e.message : 'Failed to load suns'
      } finally {
        this.loading = false
      }
    },

    async fetchBySlug(slug: string) {
      this.loading = true
      this.error = null
      try {
        const supabase = getClient()
        const { data, error } = await supabase
          .from('suns')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single()

        if (error) throw error
        this.current = data as Sun
        return data as Sun
      } catch (e: unknown) {
        this.error = e instanceof Error ? e.message : 'Sun not found'
        this.current = null
        return null
      } finally {
        this.loading = false
      }
    },

    async fetchById(id: string) {
      this.loading = true
      this.error = null
      try {
        const supabase = getClient()
        const { data, error } = await supabase
          .from('suns')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        this.current = data as Sun
        return data as Sun
      } catch (e: unknown) {
        this.error = e instanceof Error ? e.message : 'Sun not found'
        this.current = null
        return null
      } finally {
        this.loading = false
      }
    },

    async create(payload: CreateSunPayload): Promise<Sun> {
      const supabase = getClient()
      const slug = generateSlug(payload.name)

      const { data, error } = await supabase
        .from('suns')
        .insert({
          name: payload.name,
          slug,
          description: payload.description ?? null,
        })
        .select('*')
        .single()

      if (error) throw new Error(error.message)
      const sun = data as Sun
      this.suns.unshift(sun)
      return sun
    },

    async deactivate(id: string) {
      const supabase = getClient()
      const { error } = await supabase
        .from('suns')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw new Error(error.message)
      this.suns = this.suns.filter(s => s.id !== id)
      if (this.current?.id === id) this.current = null
    },
  },
})
