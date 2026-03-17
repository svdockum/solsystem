export interface Sun {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Attendee {
  id: string
  sun_id: string
  username: string
  email: string | null
  color: string        // '#a3e635' hex format
  planet_size: number  // 0.4 – 1.2
  orbit_radius: number // 4 – 18
  orbit_speed: number  // 0.05 – 0.2 rad/s
  orbit_phase: number  // 0 – 2π initial angle
  last_heartbeat: string
  joined_at: string
}

export interface JoinPayload {
  sun_id: string
  username: string
  email?: string
}

export interface CreateSunPayload {
  name: string
  description?: string
}

// Shape returned by useJoin after a successful join
export interface JoinResult {
  attendee: Attendee
  sessionToken: string
}
