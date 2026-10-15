import { useSyncExternalStore } from 'react'

/**
 * Full-screen focus mode for the weekly schedule: hides the sidebar and top bar, and asks the
 * browser for real full screen where allowed. Esc (leaving browser full screen) ends it too.
 */
let focus = false
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

function set(on: boolean) {
  if (focus === on) return
  focus = on
  emit()
  try {
    if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
    if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  } catch {
    /* browser full screen not available: the in-app focus mode still applies */
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && focus) {
      focus = false
      emit()
    }
  })
}

export function useFocusMode() {
  const on = useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => focus,
  )
  return { focus: on, setFocus: set, toggleFocus: () => set(!focus) }
}
