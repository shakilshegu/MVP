import { useEffect, useState } from 'react'

export type Theme = 'system' | 'light' | 'dark'
const KEY = 'rota-theme'

const read = (): Theme => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

/** Light, dark or follow the device; remembered on this device only. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read)
  useEffect(() => {
    apply(theme)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* not remembered in private mode */
    }
    if (theme !== 'system') return
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => apply('system')
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [theme])
  return [theme, setTheme] as const
}
