import * as THREE from 'three'
import type { Ref } from 'vue'
import type { Attendee } from '~/types'
import type { SceneContext } from './useSolarScene'
import { useCometTrails } from './useCometTrails'

interface Planet {
  mesh: THREE.Mesh
  innerGlow: THREE.Mesh
  outerGlow: THREE.Mesh
  ringRadius: number    // key into sharedRings
  angle: number
  attendee: Attendee
  targetScale: number
  currentScale: number
  pulsePhase: number
  pulseFreq: number
  spinSpeed: number   // self-rotation around Y, random per planet
}

interface SharedRing {
  line: THREE.Line
  refCount: number
}

// Keyed by radius rounded to 1 decimal — matches the fixed RING_RADII values
function ringKey(radius: number): string {
  return radius.toFixed(1)
}

function buildOrbitRingLine(radius: number): THREE.Line {
  const segments = 160
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const line = new THREE.Line(geo, mat)
  line.frustumCulled = false
  return line
}

function createPlanetMesh(attendee: Attendee, scene: THREE.Scene): {
  mesh: THREE.Mesh
  innerGlow: THREE.Mesh
  outerGlow: THREE.Mesh
} {
  const color = new THREE.Color(attendee.color)
  const r = attendee.planet_size

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 20, 20),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.6,
    }),
  )
  scene.add(mesh)

  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(r * 1.35, 20, 20),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  scene.add(innerGlow)

  const outerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(r * 2.4, 20, 20),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  scene.add(outerGlow)

  return { mesh, innerGlow, outerGlow }
}

export function usePlanetMeshes(ctx: SceneContext, attendees: Ref<Attendee[]>) {
  const planets = new Map<string, Planet>()
  const sharedRings = new Map<string, SharedRing>()
  const trails = useCometTrails(ctx)

  // ── Shared ring helpers ──────────────────────────────────────────
  function acquireRing(radius: number) {
    const key = ringKey(radius)
    const existing = sharedRings.get(key)
    if (existing) {
      existing.refCount++
      return
    }
    const line = buildOrbitRingLine(radius)
    ctx.scene.add(line)
    sharedRings.set(key, { line, refCount: 1 })
  }

  function releaseRing(radius: number) {
    const key = ringKey(radius)
    const entry = sharedRings.get(key)
    if (!entry) return
    entry.refCount--
    if (entry.refCount <= 0) {
      ctx.scene.remove(entry.line)
      entry.line.geometry.dispose()
      ;(entry.line.material as THREE.Material).dispose()
      sharedRings.delete(key)
    }
  }

  // ── Planet lifecycle ─────────────────────────────────────────────
  const addPlanet = (attendee: Attendee) => {
    if (planets.has(attendee.id)) return

    const { mesh, innerGlow, outerGlow } = createPlanetMesh(attendee, ctx.scene)
    acquireRing(attendee.orbit_radius)

    mesh.scale.setScalar(0)
    innerGlow.scale.setScalar(0)
    outerGlow.scale.setScalar(0)

    planets.set(attendee.id, {
      mesh,
      innerGlow,
      outerGlow,
      ringRadius: attendee.orbit_radius,
      angle: attendee.orbit_phase,
      attendee,
      targetScale: 1,
      currentScale: 0,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseFreq: 1.4 + Math.random() * 0.8,
      spinSpeed: (Math.random() < 0.5 ? 1 : -1) * (3.0 + Math.random() * 5.0), // ±3.0–8.0 rad/s, random direction
    })

    trails.addTrail(attendee.id, attendee.color, attendee.orbit_radius)
  }

  const removePlanet = (id: string) => {
    const planet = planets.get(id)
    if (planet) planet.targetScale = 0
  }

  const disposePlanet = (id: string) => {
    const planet = planets.get(id)
    if (!planet) return

    for (const obj of [planet.mesh, planet.innerGlow, planet.outerGlow]) {
      ctx.scene.remove(obj)
      obj.geometry.dispose()
      const mat = obj.material
      if (Array.isArray(mat)) mat.forEach(m => m.dispose())
      else (mat as THREE.Material).dispose()
    }

    releaseRing(planet.ringRadius)
    trails.removeTrail(id)
    planets.delete(id)
  }

  // ── Per-frame update ─────────────────────────────────────────────
  const update = (dt: number, elapsed: number) => {
    const toDispose: string[] = []

    for (const [id, planet] of planets) {
      planet.currentScale += (planet.targetScale - planet.currentScale) * Math.min(dt * 5, 1)

      if (planet.targetScale === 0 && planet.currentScale < 0.01) {
        toDispose.push(id)
        continue
      }

      const pulse = 1 + 0.12 * Math.sin(elapsed * planet.pulseFreq + planet.pulsePhase)
      const glowPulse = 1 + 0.28 * Math.abs(Math.sin(elapsed * planet.pulseFreq * 0.9 + planet.pulsePhase))
      const s = planet.currentScale

      planet.mesh.scale.setScalar(s * pulse)
      planet.innerGlow.scale.setScalar(s * glowPulse * 1.1)
      planet.outerGlow.scale.setScalar(s * glowPulse * 1.3)

      const mat = planet.mesh.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.6 + 0.5 * Math.abs(Math.sin(elapsed * planet.pulseFreq * 1.3 + planet.pulsePhase))

      const innerMat = planet.innerGlow.material as THREE.MeshBasicMaterial
      innerMat.opacity = 0.25 + 0.2 * Math.sin(elapsed * planet.pulseFreq + planet.pulsePhase)

      planet.angle += planet.attendee.orbit_speed * dt
      const x = Math.cos(planet.angle) * planet.attendee.orbit_radius
      const z = Math.sin(planet.angle) * planet.attendee.orbit_radius

      planet.mesh.position.set(x, 0, z)
      planet.innerGlow.position.set(x, 0, z)
      planet.outerGlow.position.set(x, 0, z)
      planet.mesh.rotation.y += dt * planet.spinSpeed

      if (planet.currentScale > 0.1) {
        trails.updateTrail(id, x, 0, z, elapsed)
      }
    }

    for (const id of toDispose) disposePlanet(id)
  }

  ctx.addUpdateCallback(update)

  watch(
    attendees,
    (list) => {
      const currentIds = new Set(list.map(a => a.id))

      // Add any attendee not yet in the planets Map
      for (const attendee of list) {
        if (!planets.has(attendee.id)) addPlanet(attendee)
      }

      // Remove any planet whose attendee has left
      for (const id of planets.keys()) {
        if (!currentIds.has(id)) removePlanet(id)
      }
    },
    { deep: true, immediate: true },
  )

  onUnmounted(() => {
    ctx.removeUpdateCallback(update)
    for (const id of [...planets.keys()]) disposePlanet(id)
    // Clear any remaining rings (should be 0 after disposePlanet, but safety net)
    for (const { line } of sharedRings.values()) {
      ctx.scene.remove(line)
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    }
    sharedRings.clear()
    trails.clear()
  })

  return { planets }
}
