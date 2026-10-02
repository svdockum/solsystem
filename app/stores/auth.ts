import { defineStore } from 'pinia'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
  },

  actions: {
    // Called once from the Supabase plugin
    async init(supabase: SupabaseClient) {
      const { data } = await supabase.auth.getSession()
      this.user = data.session?.user ?? null

      supabase.auth.onAuthStateChange((_event, session) => {
        this.user = session?.user ?? null
      })
    },

    async signIn(email: string, password: string) {
      const { data, error } = await useSupabase().auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      this.user = data.user
    },

    /** Returns true when the account still has to be confirmed by email. */
    async signUp(email: string, password: string): Promise<boolean> {
      const { data, error } = await useSupabase().auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw new Error(error.message)
      this.user = data.session?.user ?? null
      return !data.session
    },

    async signOut() {
      await useSupabase().auth.signOut()
      this.user = null
    },
  },
})
