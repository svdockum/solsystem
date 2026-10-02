import type { Ref } from 'vue'
import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill'
import type { BarcodeFormat } from 'barcode-detector/ponyfill'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

// 1D formats found on student cards. Fewer formats = faster and fewer misreads.
const FORMATS: BarcodeFormat[] = [
  'code_128', 'code_39', 'code_93', 'codabar', 'itf',
  'ean_13', 'ean_8', 'upc_a', 'upc_e',
]

const SCAN_INTERVAL_MS = 120
// A value must be read this many times in a row before it counts (guards against misreads)
const CONFIRM_READS = 2
// The same barcode only counts again after it has been out of view this long,
// so a card held in front of the camera is not scanned over and over
const RESCAN_AFTER_MS = 4000

type Facing = 'environment' | 'user'

let wasmPrepared = false

export function useBarcodeScanner(
  video: Ref<HTMLVideoElement | null>,
  onScan: (value: string) => void,
) {
  const active = ref(false)
  const starting = ref(false)
  const paused = ref(false)
  const error = ref('')
  // Rear camera by default; 'user' when the screen faces the students
  const facing = useLocalStorage<Facing>('solsystem_scanner_facing', 'environment')

  let stream: MediaStream | null = null
  let detector: BarcodeDetector | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  let candidate = ''
  let candidateReads = 0
  let lastValue = ''
  let lastSeenAt = 0

  const handleRead = (value: string) => {
    if (!value) {
      candidate = ''
      candidateReads = 0
      return
    }

    const now = Date.now()
    if (value === lastValue) {
      const outOfViewFor = now - lastSeenAt
      lastSeenAt = now
      if (outOfViewFor < RESCAN_AFTER_MS) return
      lastValue = '' // back after a pause: treat as a fresh scan
    }

    if (value === candidate) {
      candidateReads++
    } else {
      candidate = value
      candidateReads = 1
    }

    if (candidateReads >= CONFIRM_READS) {
      lastValue = value
      lastSeenAt = now
      candidate = ''
      candidateReads = 0
      onScan(value)
    }
  }

  const tick = async () => {
    timer = null
    if (!active.value) return

    const el = video.value
    if (el && detector && !paused.value && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      try {
        const results = await detector.detect(el)
        handleRead(results[0]?.rawValue.trim() ?? '')
      } catch {
        // frame not decodable yet — try again on the next tick
      }
    }

    if (active.value) timer = setTimeout(tick, SCAN_INTERVAL_MS)
  }

  const stop = () => {
    active.value = false
    if (timer) clearTimeout(timer)
    timer = null
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    if (video.value) video.value.srcObject = null
  }

  const start = async () => {
    if (starting.value) return
    stop()
    error.value = ''

    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'The camera is not available. Open this page over HTTPS.'
      return
    }

    starting.value = true
    try {
      if (!wasmPrepared) {
        // Serve the decoder from our own bundle instead of a CDN
        prepareZXingModule({
          overrides: {
            locateFile: (path: string, prefix: string) =>
              path.endsWith('.wasm') ? wasmUrl : prefix + path,
          },
        })
        wasmPrepared = true
      }
      detector ??= new BarcodeDetector({ formats: FORMATS })

      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facing.value },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      const el = video.value
      if (!el) {
        stop()
        return
      }
      el.srcObject = stream
      await el.play()

      active.value = true
      tick()
    } catch (e: unknown) {
      stop()
      const name = e instanceof DOMException ? e.name : ''
      error.value = name === 'NotAllowedError'
        ? 'Camera access was denied. Allow the camera for this site and try again.'
        : name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Could not start the camera.'
    } finally {
      starting.value = false
    }
  }

  const flip = async () => {
    facing.value = facing.value === 'environment' ? 'user' : 'environment'
    await start()
  }

  /** Forget the last barcode, so the same card counts again right away. */
  const reset = () => {
    candidate = ''
    candidateReads = 0
    lastValue = ''
  }

  // Phones cut the camera when the tab goes to the background
  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !active.value) return
    const live = stream?.getVideoTracks().some(track => track.readyState === 'live')
    if (!live) start()
  })

  onUnmounted(stop)

  return { active, starting, paused, error, facing, start, stop, flip, reset }
}
