// 15 fixed ring radii. All joiners are randomly assigned to one of these.
// Multiple planets can share a ring — they spread by orbit_phase.
export const RING_RADII = [
   9.5, 10.8, 12.1, 13.4, 14.7, 16.0, 17.3, 18.6,
  19.9, 21.2, 22.5, 23.8, 25.1, 26.4, 27.7,
] as const

export const MAX_RINGS = RING_RADII.length // 15

const MIN_RING_RADIUS = RING_RADII[0]                       // 9.5
const MAX_RING_RADIUS = RING_RADII[MAX_RINGS - 1]! as number // 27.7

/** Linear scale: innermost ring = 1.0, outermost ring = 0.7 (trail 30% shorter) */
export function trailLengthScale(orbitRadius: number): number {
  const t = (orbitRadius - MIN_RING_RADIUS) / (MAX_RING_RADIUS - MIN_RING_RADIUS)
  return 1.0 - 0.3 * Math.max(0, Math.min(1, t))
}

export function randomRingRadius(): number {
  return RING_RADII[Math.floor(Math.random() * MAX_RINGS)]!
}
