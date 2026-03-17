import * as THREE from 'three'
import type { Ref } from 'vue'

type UpdateCallback = (deltaTime: number, elapsedTime: number) => void

export interface SceneContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  clock: THREE.Clock
  addUpdateCallback: (cb: UpdateCallback) => void
  removeUpdateCallback: (cb: UpdateCallback) => void
}

function createStarField(scene: THREE.Scene) {
  const count = 2000
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const radius = 80 + Math.random() * 120
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, sizeAttenuation: true })
  scene.add(new THREE.Points(geo, mat))
}

function createSun(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group()

  // Core
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xfdb813 }),
  ))

  // Inner glow
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfdb813,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  ))

  // Outer glow
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff8c00,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  ))

  scene.add(group)
  return group
}

export function useSolarScene(container: Ref<HTMLElement | null>): SceneContext {
  const updateCallbacks: UpdateCallback[] = []
  let animFrameId: number | null = null
  let resizeObserver: ResizeObserver | null = null
  let renderer: THREE.WebGLRenderer | null = null

  // Create scene objects synchronously — no browser APIs needed
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000005)

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000)
  camera.position.set(0, 28, 42)
  camera.lookAt(0, 0, 0)

  const clock = new THREE.Clock()

  // Add lights + scene objects (no DOM access)
  scene.add(new THREE.PointLight(0xfdb813, 2.5, 120))
  scene.add(new THREE.AmbientLight(0x111122, 0.8))
  createStarField(scene)
  const sunGroup = createSun(scene)

  let cameraAngle = 0

  const animate = () => {
    if (!renderer) return
    animFrameId = requestAnimationFrame(animate)
    const dt = Math.min(clock.getDelta(), 0.1) // clamp to avoid jump on tab switch
    const elapsed = clock.getElapsedTime()

    // Slow camera orbit around Y axis
    cameraAngle += dt * 0.108
    camera.position.set(
      Math.sin(cameraAngle) * 48,
      28,
      Math.cos(cameraAngle) * 48,
    )
    camera.lookAt(0, 0, 0)

    // Sun pulse + spin
    const pulse = 1 + Math.sin(elapsed * 1.2) * 0.03
    sunGroup.scale.setScalar(pulse)
    sunGroup.rotation.y += dt * 0.1

    for (const cb of updateCallbacks) {
      cb(dt, elapsed)
    }

    renderer.render(scene, camera)
  }

  onMounted(() => {
    if (!container.value) return

    // Create renderer here — needs browser/DOM context
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000005, 1)
    container.value.appendChild(renderer.domElement)

    const setSize = () => {
      const el = container.value
      if (!el || !renderer) return
      const w = el.clientWidth || window.innerWidth
      const h = el.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    setSize()
    resizeObserver = new ResizeObserver(setSize)
    resizeObserver.observe(container.value)

    clock.start()
    animate()
  })

  onUnmounted(() => {
    if (animFrameId !== null) cancelAnimationFrame(animFrameId)
    resizeObserver?.disconnect()
    if (renderer) {
      renderer.domElement.parentElement?.removeChild(renderer.domElement)
      renderer.dispose()
      renderer = null
    }
  })

  const addUpdateCallback = (cb: UpdateCallback) => updateCallbacks.push(cb)
  const removeUpdateCallback = (cb: UpdateCallback) => {
    const idx = updateCallbacks.indexOf(cb)
    if (idx !== -1) updateCallbacks.splice(idx, 1)
  }

  return { scene, camera, clock, addUpdateCallback, removeUpdateCallback }
}
