import { useCallback, useEffect, useState } from 'react'

export type Route = { path: string; parts: string[]; query: URLSearchParams }

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, qs] = raw.split('?')
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) }
}

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => {
      setRoute(parse())
      document.getElementById('main')?.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export const navigate = (to: string) => {
  window.location.hash = to
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

/** Stands in for a network fetch: brief loading state, and an error when there's no connection. */
export function useLoad(key: string) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setStatus('loading')
    const t = setTimeout(() => setStatus(navigator.onLine ? 'ready' : 'error'), 450)
    return () => clearTimeout(t)
  }, [key, attempt])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { status, retry }
}

export function useMediaQuery(q: string) {
  const [match, setMatch] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [q])
  return match
}
