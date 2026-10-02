export type ScanDirection = 'enter' | 'leave'
export type Mood = 'energetic' | 'fine' | 'tired'
export type Rating = 'outstanding' | 'good' | 'normal' | 'could_be_better' | 'very_boring'

export interface Sun {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  show_student_numbers: boolean
  scan_mode: ScanDirection
  created_at: string
  updated_at: string
}

// What anonymous visitors get from the get_sun_by_slug RPC
export type PublicSun = Pick<Sun, 'id' | 'name' | 'slug' | 'description' | 'created_at'>

export interface Attendee {
  id: string
  sun_id: string
  source: 'qr' | 'scan' // joined via QR code, or scanned in by the teacher
  username: string      // scanned planets: student number, or '' when hidden
  color: string        // '#a3e635' hex format
  planet_size: number  // 0.35 – 0.90
  orbit_radius: number // one of RING_RADII
  orbit_speed: number  // 0.162 – 1.134 rad/s
  orbit_phase: number  // 0 – 2π initial angle
  last_heartbeat: string
  joined_at: string
}

export interface Scan {
  id: string
  sun_id: string
  student_number: string
  direction: ScanDirection
  mood: Mood | null     // answered on enter
  rating: Rating | null // answered on leave
  scanned_at: string
}

// One row of the attendance list: a student's enter and leave scan
export interface StudentScans {
  student_number: string
  enter: Scan | null
  leave: Scan | null
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
