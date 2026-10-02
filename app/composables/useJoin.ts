import type { Attendee, JoinPayload, JoinResult } from '~/types'
import { randomRingRadius } from '~/utils/orbits'

// Curated palette - vibrant, space-appropriate, visible on dark backgrounds.
// Scanned planets get theirs in SQL: keep record_scan() in the migrations in sync.
const PLANET_COLORS = [
  '#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#FF9FF3',
  '#54A0FF', '#5F27CD', '#00D2D3', '#1DD1A1', '#C44569',
  '#F8B739', '#EE5A24', '#009432', '#0652DD', '#9980FA',
  '#EA2027', '#006266', '#ED4C67', '#B53471', '#833471',
  '#7EFFF5', '#67E480', '#E96900', '#A29BFE', '#FD79A8',
]

function generatePlanetColor(): string {
  return PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)] ?? '#54A0FF'
}

export function useJoin() {
  const supabase = useSupabase()

  const join = async (payload: JoinPayload): Promise<JoinResult> => {
    const sessionToken = crypto.randomUUID()

    const { data, error } = await supabase
      .from('attendees')
      .insert({
        sun_id: payload.sun_id,
        username: payload.username,
        email: payload.email ?? null,
        color: generatePlanetColor(),
        planet_size: 0.35 + Math.random() * 0.55,       // 0.35 – 0.90
        orbit_speed: 0.162 + Math.random() * 0.972,       // 0.162 – 1.134 rad/s (×3, +200%)
        orbit_phase: Math.random() * Math.PI * 2,        // 0 – 2π, spreads planets on shared rings
        orbit_radius: randomRingRadius(),                 // one of 15 fixed rings, random pick
        session_token: sessionToken,
      })
      .select('id, sun_id, source, username, color, planet_size, orbit_radius, orbit_speed, orbit_phase, last_heartbeat, joined_at')
      .single()

    if (error) throw error

    return { attendee: data as Attendee, sessionToken }
  }

  return { join }
}
