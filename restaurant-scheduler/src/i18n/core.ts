import { en } from './en'
import { de } from './de'

export type Locale = 'en' | 'de'

export const LOCALES: { code: Locale; label: string; short: string; intl: string }[] = [
  { code: 'en', label: 'English', short: 'EN', intl: 'en-GB' },
  { code: 'de', label: 'Deutsch', short: 'DE', intl: 'de-DE' },
]

export type Plural = { one: string; other: string }
export type Params = Record<string, string | number>

/** Every translation must have exactly the English shape: strings stay strings, plurals stay plurals. */
export type Shape<T> = { [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : Shape<T[K]> }

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | Plural ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]

export type MsgKey = Leaves<typeof en>

const dicts: Record<Locale, Shape<typeof en>> = { en, de }
const plurals: Partial<Record<Locale, Intl.PluralRules>> = {}

let current: Locale = 'en'
export const getLocale = () => current
export const setCurrentLocale = (l: Locale) => {
  current = l
}
export const intlLocale = (l: Locale = current) => LOCALES.find((x) => x.code === l)!.intl

function lookup(dict: unknown, key: string): string | Plural | undefined {
  let node = dict
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return node as string | Plural | undefined
}

const interpolate = (s: string, params?: Params) => (params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s)

export function translate(key: MsgKey, params?: Params, locale: Locale = current): string {
  const msg = lookup(dicts[locale], key) ?? lookup(en, key)
  if (msg == null) return key
  if (typeof msg === 'string') return interpolate(msg, params)
  const count = Number(params?.count ?? 0)
  const rules = (plurals[locale] ??= new Intl.PluralRules(intlLocale(locale)))
  const form = rules.select(count) === 'one' ? msg.one : msg.other
  return interpolate(form, params)
}

/** For code outside React (store, PDF, seed). Uses the active locale. */
export const tr = (key: MsgKey, params?: Params) => translate(key, params)
