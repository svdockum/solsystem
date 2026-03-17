import * as THREE from 'three'
import type { SceneContext } from './useSolarScene'
import { trailLengthScale } from '~/utils/orbits'

const TRAIL_LENGTH = 180
const BLOOM_FRACTION = 0.7 // bloom is 30% shorter than core

type TrailStyle = 'solid' | 'dots' | 'stripes'

// solid appears 3× — more common than dots (2×) and stripes (1×)
const TRAIL_STYLES: TrailStyle[] = ['solid', 'solid', 'solid', 'dots', 'dots', 'stripes']

function randomStyle(): TrailStyle {
  return TRAIL_STYLES[Math.floor(Math.random() * TRAIL_STYLES.length)]!
}

function styleVisibility(i: number, style: TrailStyle): number {
  if (style === 'solid')   return 1
  if (style === 'dots')    return i % 5 === 0 ? 1 : 0
  if (style === 'stripes') return Math.floor(i / 6) % 2 === 0 ? 1 : 0
  return 1
}

let sharedTexture: THREE.Texture | null = null

function getGlowTexture(): THREE.Texture {
  if (sharedTexture) return sharedTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx)
  grad.addColorStop(0.0,  'rgba(255,255,255,1.0)')
  grad.addColorStop(0.08, 'rgba(255,255,255,0.95)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.5)')
  grad.addColorStop(0.55, 'rgba(255,255,255,0.1)')
  grad.addColorStop(1.0,  'rgba(255,255,255,0.0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  sharedTexture = new THREE.CanvasTexture(canvas)
  return sharedTexture
}

const VERT = /* glsl */`
  attribute float aSize;
  attribute float aOpacity;
  attribute vec3  aColor;
  varying float vOpacity;
  varying vec3  vColor;
  void main() {
    vOpacity = aOpacity;
    vColor   = aColor;
    vec4 mvPos   = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (400.0 / -mvPos.z);
    gl_Position  = projectionMatrix * mvPos;
  }
`

const FRAG = /* glsl */`
  uniform sampler2D uTexture;
  varying float vOpacity;
  varying vec3  vColor;
  void main() {
    vec4 tex = texture2D(uTexture, gl_PointCoord);
    float a  = tex.r * vOpacity;
    if (a < 0.005) discard;
    gl_FragColor = vec4(vColor * tex.r, a);
  }
`

interface TrailLayer {
  points: THREE.Points
  geometry: THREE.BufferGeometry
  posArr: Float32Array
  sizeArr: Float32Array
  opacityArr: Float32Array
  colorArr: Float32Array
}

interface Trail {
  core: TrailLayer
  bloom: TrailLayer
  ringPositions: Float32Array
  head: number
  filled: number
  color: THREE.Color
  style: TrailStyle
  lengthScale: number  // 1.0 inner ring → 0.7 outer ring
  pulsePhase: number   // random offset so trails pulse out of sync
  pulseFreq: number    // slightly varied frequency per trail
}

function makeLayer(): TrailLayer {
  const geo        = new THREE.BufferGeometry()
  const posArr     = new Float32Array(TRAIL_LENGTH * 3)
  const sizeArr    = new Float32Array(TRAIL_LENGTH)
  const opacityArr = new Float32Array(TRAIL_LENGTH)
  const colorArr   = new Float32Array(TRAIL_LENGTH * 3)

  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizeArr, 1))
  geo.setAttribute('aOpacity', new THREE.BufferAttribute(opacityArr, 1))
  geo.setAttribute('aColor',   new THREE.BufferAttribute(colorArr, 3))
  geo.setDrawRange(0, 0)

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTexture: { value: getGlowTexture() } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  return { points, geometry: geo, posArr, sizeArr, opacityArr, colorArr }
}

export function useCometTrails(ctx: SceneContext) {
  const trails = new Map<string, Trail>()

  const addTrail = (id: string, hexColor: string, orbitRadius: number) => {
    const core  = makeLayer()
    const bloom = makeLayer()
    ctx.scene.add(core.points)
    ctx.scene.add(bloom.points)
    trails.set(id, {
      core,
      bloom,
      ringPositions: new Float32Array(TRAIL_LENGTH * 3),
      head: 0,
      filled: 0,
      color: new THREE.Color(hexColor),
      style: randomStyle(),
      lengthScale: trailLengthScale(orbitRadius),
      pulsePhase: Math.random() * Math.PI * 2,
      pulseFreq: 1.5 + Math.random() * 1.0,
    })
  }

  const disposeLayer = (layer: TrailLayer) => {
    ctx.scene.remove(layer.points)
    layer.geometry.dispose()
    ;(layer.points.material as THREE.Material).dispose()
  }

  const removeTrail = (id: string) => {
    const trail = trails.get(id)
    if (!trail) return
    disposeLayer(trail.core)
    disposeLayer(trail.bloom)
    trails.delete(id)
  }

  const updateTrail = (id: string, x: number, y: number, z: number, elapsed: number) => {
    const trail = trails.get(id)
    if (!trail) return

    trail.ringPositions[trail.head * 3]     = x
    trail.ringPositions[trail.head * 3 + 1] = y
    trail.ringPositions[trail.head * 3 + 2] = z
    trail.head   = (trail.head + 1) % TRAIL_LENGTH
    trail.filled = Math.min(trail.filled + 1, TRAIL_LENGTH)

    const rawCount = trail.filled
    if (rawCount < 2) return

    const { core, bloom, color, style, lengthScale, pulsePhase, pulseFreq } = trail
    const sinA  = Math.sin(elapsed * pulseFreq + pulsePhase)
    const sinB  = Math.sin(elapsed * pulseFreq * 1.7 + pulsePhase + 1.2)
    const pulse         = 1 + 0.55 * sinA + 0.2 * sinB          // size breathes ±75%
    const opacityPulse  = 0.7 + 0.3 * Math.abs(sinA)            // opacity 0.7–1.0

    // Outer rings get shorter trails — trim from the tail (oldest positions)
    const coreCount  = Math.max(2, Math.floor(rawCount * lengthScale))
    const bloomCount = Math.max(2, Math.floor(coreCount * BLOOM_FRACTION))
    const coreOffset = rawCount - coreCount  // skip oldest positions

    for (let i = 0; i < coreCount; i++) {
      const bufIdx = (trail.head - coreCount + i + TRAIL_LENGTH) % TRAIL_LENGTH

      core.posArr[i * 3]     = trail.ringPositions[bufIdx * 3]     ?? 0
      core.posArr[i * 3 + 1] = trail.ringPositions[bufIdx * 3 + 1] ?? 0
      core.posArr[i * 3 + 2] = trail.ringPositions[bufIdx * 3 + 2] ?? 0

      const t   = i / (coreCount - 1)
      const vis = styleVisibility(i, style)

      core.sizeArr[i]          = (0.25 + t * 0.65) * pulse
      core.opacityArr[i]       = Math.pow(t, 1.5) * opacityPulse * vis
      core.colorArr[i * 3]     = color.r
      core.colorArr[i * 3 + 1] = color.g
      core.colorArr[i * 3 + 2] = color.b
    }

    // Bloom covers the most-recent bloomCount positions of the (already trimmed) core
    const bloomOffset = coreCount - bloomCount
    for (let i = 0; i < bloomCount; i++) {
      const srcIdx = bloomOffset + i
      bloom.posArr[i * 3]     = core.posArr[srcIdx * 3]     ?? 0
      bloom.posArr[i * 3 + 1] = core.posArr[srcIdx * 3 + 1] ?? 0
      bloom.posArr[i * 3 + 2] = core.posArr[srcIdx * 3 + 2] ?? 0

      const t   = i / (bloomCount - 1)
      const vis = styleVisibility(bloomOffset + i, style)

      bloom.sizeArr[i]          = (1.0 + t * 2.2) * pulse
      bloom.opacityArr[i]       = Math.pow(t, 2.2) * 0.55 * opacityPulse * vis
      bloom.colorArr[i * 3]     = color.r
      bloom.colorArr[i * 3 + 1] = color.g
      bloom.colorArr[i * 3 + 2] = color.b
    }

    for (const g of [core.geometry, bloom.geometry]) {
      ;(g.attributes.position as THREE.BufferAttribute).needsUpdate = true
      ;(g.attributes.aSize    as THREE.BufferAttribute).needsUpdate = true
      ;(g.attributes.aOpacity as THREE.BufferAttribute).needsUpdate = true
      ;(g.attributes.aColor   as THREE.BufferAttribute).needsUpdate = true
    }
    core.geometry.setDrawRange(0, coreCount)
    bloom.geometry.setDrawRange(0, bloomCount)
  }

  const clear = () => {
    for (const id of [...trails.keys()]) removeTrail(id)
    if (sharedTexture) {
      sharedTexture.dispose()
      sharedTexture = null
    }
  }

  return { addTrail, removeTrail, updateTrail, clear }
}
