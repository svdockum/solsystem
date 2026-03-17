import type { Ref } from 'vue'

const HEARTBEAT_INTERVAL_MS = 60_000  // send heartbeat every 60s
const IDLE_TIMEOUT_MS = 9 * 60_000   // auto-leave after 9min idle (server cleans at 10min)
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const

export function useHeartbeat(sunId: Ref<string>, sunSlug: Ref<string>) {
  const supabase = useSupabase()

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  const getToken = () => sessionStorage.getItem(`solsystem_token_${sunId.value}`)

  const sendHeartbeat = async () => {
    const token = getToken()
    if (!token) return
    await supabase.rpc('heartbeat', { p_token: token })
  }

  const deleteAttendee = async (token: string) => {
    await supabase.from('attendees').delete().eq('session_token', token)
    sessionStorage.removeItem(`solsystem_token_${sunId.value}`)
  }

  const handleIdle = async () => {
    const token = getToken()
    if (token) await deleteAttendee(token)
    await navigateTo(`/join/${sunSlug.value}?idle=1`)
  }

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(handleIdle, IDLE_TIMEOUT_MS)
  }

  const start = () => {
    sendHeartbeat()
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    ACTIVITY_EVENTS.forEach(e =>
      window.addEventListener(e, resetIdleTimer, { passive: true }),
    )
    resetIdleTimer()
  }

  const stop = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    if (idleTimer) clearTimeout(idleTimer)
    ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetIdleTimer))
  }

  const leave = async () => {
    stop()
    const token = getToken()
    if (token) await deleteAttendee(token)
  }

  onMounted(start)
  onUnmounted(stop)

  return { leave }
}
