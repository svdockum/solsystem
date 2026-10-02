import { defineStore } from 'pinia'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Mood, Rating, Scan, ScanDirection, StudentScans } from '~/types'

const SCAN_COLUMNS = 'id,sun_id,student_number,direction,mood,rating,scanned_at'

export const useScansStore = defineStore('scans', {
  state: () => ({
    scans: [] as Scan[],
    channel: null as RealtimeChannel | null,
    loading: false,
  }),

  getters: {
    enterCount: (state) => state.scans.filter(s => s.direction === 'enter').length,
    leaveCount: (state) => state.scans.filter(s => s.direction === 'leave').length,

    // One row per student, most recently scanned first
    byStudent: (state): StudentScans[] => {
      const rows = new Map<string, StudentScans>()
      for (const scan of state.scans) {
        const row = rows.get(scan.student_number)
          ?? { student_number: scan.student_number, enter: null, leave: null }
        row[scan.direction] = scan
        rows.set(scan.student_number, row)
      }
      const latest = (row: StudentScans) =>
        Math.max(
          row.enter ? new Date(row.enter.scanned_at).getTime() : 0,
          row.leave ? new Date(row.leave.scanned_at).getTime() : 0,
        )
      return [...rows.values()].sort((a, b) => latest(b) - latest(a))
    },
  },

  actions: {
    async fetchScans(sunId: string) {
      this.loading = true
      try {
        const { data, error } = await useSupabase()
          .from('scans')
          .select(SCAN_COLUMNS)
          .eq('sun_id', sunId)
          .order('scanned_at', { ascending: false })

        if (error) throw error
        this.scans = data as Scan[]
      } finally {
        this.loading = false
      }
    },

    // A student has at most one scan per direction, so a re-scan replaces the old one
    upsertLocal(scan: Scan) {
      const idx = this.scans.findIndex(s =>
        s.id === scan.id
        || (s.student_number === scan.student_number && s.direction === scan.direction),
      )
      if (idx !== -1) this.scans[idx] = scan
      else this.scans.unshift(scan)
    },

    subscribeToSun(sunId: string) {
      const supabase = useSupabase()

      if (this.channel) {
        this.channel.unsubscribe()
        this.channel = null
      }

      this.channel = supabase
        .channel(`sun-scans-${sunId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'scans', filter: `sun_id=eq.${sunId}` },
          (payload) => this.upsertLocal(payload.new as Scan),
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'scans', filter: `sun_id=eq.${sunId}` },
          (payload) => this.upsertLocal(payload.new as Scan),
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'scans', filter: `sun_id=eq.${sunId}` },
          (payload) => {
            const deleted = payload.old as { id: string }
            this.scans = this.scans.filter(s => s.id !== deleted.id)
          },
        )
        .subscribe()
    },

    // Stores the scan with the current time. Scanning the same student again in
    // the same direction overwrites the earlier scan and clears its answer.
    async record(sunId: string, studentNumber: string, direction: ScanDirection): Promise<Scan> {
      const { data, error } = await useSupabase().rpc('record_scan', {
        p_sun_id: sunId,
        p_student_number: studentNumber,
        p_direction: direction,
      })

      if (error) throw new Error(error.message)
      const scan = data as Scan
      this.upsertLocal(scan)
      return scan
    },

    async setAnswer(scanId: string, answer: { mood: Mood | null } | { rating: Rating | null }): Promise<Scan> {
      const { data, error } = await useSupabase()
        .from('scans')
        .update(answer)
        .eq('id', scanId)
        .select(SCAN_COLUMNS)
        .single()

      if (error) throw new Error(error.message)
      const scan = data as Scan
      this.upsertLocal(scan)
      return scan
    },

    // Removes both the enter and the leave scan of one student
    async removeStudent(sunId: string, studentNumber: string) {
      const { error } = await useSupabase()
        .from('scans')
        .delete()
        .eq('sun_id', sunId)
        .eq('student_number', studentNumber)

      if (error) throw new Error(error.message)
      this.scans = this.scans.filter(s => s.student_number !== studentNumber)
    },

    unsubscribe() {
      if (this.channel) {
        this.channel.unsubscribe()
        this.channel = null
      }
      this.scans = []
    },
  },
})
