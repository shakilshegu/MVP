import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { setDateLocale } from '../lib/date'
import { intlLocale, LOCALES, setCurrentLocale, translate } from './core'
import type { Locale, MsgKey, Params } from './core'

export type { Locale, MsgKey } from './core'
export { LOCALES } from './core'

const STORAGE_KEY = 'rota-locale'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LOCALES.some((l) => l.code === saved)) return saved as Locale
  } catch {
    /* storage blocked: fall back to the browser language */
  }
  return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

function apply(l: Locale) {
  setCurrentLocale(l)
  setDateLocale(intlLocale(l))
}

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (key: MsgKey, params?: Params) => string }

const I18nCtx = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLoc] = useState<Locale>(() => {
    const l = initialLocale()
    apply(l)
    return l
  })

  const setLocale = useCallback((l: Locale) => {
    apply(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* preference just won't persist */
    }
    setLoc(l)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<Ctx>(() => ({ locale, setLocale, t: (key, params) => translate(key, params, locale) }), [locale, setLocale])
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

export function useT() {
  const c = useContext(I18nCtx)
  if (!c) throw new Error('useT outside I18nProvider')
  return c
}
