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

export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const fmt = (k: string, o: Intl.DateTimeFormatOptions) => fromKey(k).toLocaleDateString('en-GB', o)
export const fmtDay = (k: string) => fmt(k, { weekday: 'short', day: 'numeric', month: 'short' })
export const fmtShort = (k: string) => fmt(k, { day: 'numeric', month: 'short' })
export const fmtLong = (k: string) => fmt(k, { weekday: 'long', day: 'numeric', month: 'long' })

export function fmtRange(a: string, b: string) {
  if (a === b) return fmtShort(a)
  if (a.slice(0, 7) === b.slice(0, 7)) return `${fromKey(a).getDate()}–${fmtShort(b)}`
  return `${fmtShort(a)} – ${fmtShort(b)}`
}

export function toMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function hoursBetween(start: string, end: string) {
  let d = toMin(end) - toMin(start)
  if (d <= 0) d += 1440
  return d / 60
}

export function relTime(iso: string) {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${Math.round(mins)} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  if (mins < 60 * 48) return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const daysAgoIso = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3600000).toISOString()
