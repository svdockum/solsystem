import { defineStore } from 'pinia'
import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Attendee } from '~/types'

function getClient() {
  const nuxtApp = useNuxtApp()
  if (nuxtApp.$supabase) return nuxtApp.$supabase as ReturnType<typeof createClient>
  const config = useRuntimeConfig()
  return createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
}

const ATTENDEE_COLUMNS = 'id,sun_id,username,email,color,planet_size,orbit_radius,orbit_speed,orbit_phase,last_heartbeat,joined_at'

export const useAttendeesStore = defineStore('attendees', {
  state: () => ({
    attendees: [] as Attendee[],
    channel: null as RealtimeChannel | null,
    loading: false,
  }),

  getters: {
    count: (state) => state.attendees.length,
    byId: (state) => (id: string) => state.attendees.find(a => a.id === id),
    sortedByJoined: (state) =>
      [...state.attendees].sort(
        (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
      ),
  },

  actions: {
    async fetchAttendees(sunId: string) {
      this.loading = true
      try {
        const supabase = getClient()
        const { data, error } = await supabase
          .from('attendees')
          .select(ATTENDEE_COLUMNS)
          .eq('sun_id', sunId)
          .order('joined_at', { ascending: true })

        if (error) throw error
        this.attendees = data as Attendee[]
      } finally {
        this.loading = false
      }
    },

    subscribeToSun(sunId: string) {
      const supabase = useSupabase()

      // Unsubscribe from any previous channel
      if (this.channel) {
        this.channel.unsubscribe()
        this.channel = null
      }

      this.channel = supabase
        .channel(`sun-attendees-${sunId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'attendees',
            filter: `sun_id=eq.${sunId}`,
          },
          (payload) => {
            const newAttendee = payload.new as Attendee
            // Avoid duplicates
            if (!this.attendees.find(a => a.id === newAttendee.id)) {
              this.attendees.push(newAttendee)
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'attendees',
            filter: `sun_id=eq.${sunId}`,
          },
          (payload) => {
            const updated = payload.new as Attendee
            const idx = this.attendees.findIndex(a => a.id === updated.id)
            if (idx !== -1) {
              this.attendees[idx] = { ...this.attendees[idx], ...updated }
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'attendees',
            filter: `sun_id=eq.${sunId}`,
          },
          (payload) => {
            const deleted = payload.old as { id: string }
            this.attendees = this.attendees.filter(a => a.id !== deleted.id)
          },
        )
        .subscribe()
    },

    async removeAttendee(attendeeId: string) {
      const supabase = getClient()
      const { error } = await supabase
        .from('attendees')
        .delete()
        .eq('id', attendeeId)
      if (error) throw error
      this.attendees = this.attendees.filter(a => a.id !== attendeeId)
    },

    unsubscribe() {
      if (this.channel) {
        this.channel.unsubscribe()
        this.channel = null
      }
      this.attendees = []
    },
  },
})
