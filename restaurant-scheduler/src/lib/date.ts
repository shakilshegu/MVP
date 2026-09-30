/** All formatting follows the active app language; the i18n provider sets it. */
let LOC = 'en-GB'
export const setDateLocale = (l: string) => {
  LOC = l
}

export const pad = (n: number) => String(n).padStart(2, '0')
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function fromKey(k: string) {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => toKey(new Date())

export function addDays(k: string, n: number) {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/** Monday = 0 */
export const weekdayIndex = (k: string) => (fromKey(k).getDay() + 6) % 7
export const startOfWeek = (k: string) => addDays(k, -weekdayIndex(k))
export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i))

export function dayNumber(k: string) {
  const [y, m, d] = k.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000
}
export const daysInclusive = (a: string, b: string) => dayNumber(b) - dayNumber(a) + 1

// 1 January 2024 was a Monday.
const weekday = (i: number, style: 'short' | 'long') => new Date(2024, 0, 1 + i).toLocaleDateString(LOC, { weekday: style }).replace(/\.$/, '')
export const dayShort = (i: number) => weekday(i, 'short')
export const dayLong = (i: number) => weekday(i, 'long')
export const WEEK = [0, 1, 2, 3, 4, 5, 6]

export const fmt = (k: string, o: Intl.DateTimeFormatOptions) => fromKey(k).toLocaleDateString(LOC, o)
export const fmtDay = (k: string) => fmt(k, { weekday: 'short', day: 'numeric', month: 'short' })
export const fmtShort = (k: string) => fmt(k, { day: 'numeric', month: 'short' })
export const fmtLong = (k: string) => fmt(k, { weekday: 'long', day: 'numeric', month: 'long' })
export const fmtMonthYear = (k: string) => fmt(k, { month: 'long', year: 'numeric' })

export function fmtRange(a: string, b: string) {
  if (a === b) return fmtShort(a)
  return new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'short' }).formatRange(fromKey(a), fromKey(b))
}
export const fmtRangeYear = (a: string, b: string) =>
  new Intl.DateTimeFormat(LOC, { day: 'numeric', month: 'short', year: 'numeric' }).formatRange(fromKey(a), fromKey(b))

export function toMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function hoursBetween(start: string, end: string) {
  let d = toMin(end) - toMin(start)
  if (d <= 0) d += 1440
  return d / 60
}

/** "8 h 30 min" — reads naturally in English and German. */
export const fmtDuration = (mins: number) => `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ''}`

export function relTime(iso: string) {
  const rtf = new Intl.RelativeTimeFormat(LOC, { numeric: 'auto' })
  const mins = (Date.now() - new Date(iso).getTime()) / 60000
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  if (mins < 1) return cap(rtf.format(0, 'second'))
  if (mins < 60) return cap(rtf.format(-Math.round(mins), 'minute'))
  if (mins < 60 * 24) return cap(rtf.format(-Math.round(mins / 60), 'hour'))
  if (mins < 60 * 48) return cap(rtf.format(-1, 'day'))
  return new Date(iso).toLocaleDateString(LOC, { day: 'numeric', month: 'short' })
}

export const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString(LOC, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' })
export const fmtDayHeading = (iso: string) => new Date(iso).toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long' })

export const daysAgoIso = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3600000).toISOString()
