import { hoursBetween, toKey, toMin } from './date'
import { isActive } from './validation'
import type { Assignment, Data, Employee } from './types'

export type Worked = { a: Assignment; hours: number; amount: number }

/** A shift counts as worked once it is published and its end time has passed. */
export function isWorked(s: Data, a: Assignment, now = new Date()) {
  if (a.state !== 'published') return false
  const t = s.templates.find((x) => x.id === a.templateId)
  if (!t) return false
  const today = toKey(now)
  if (a.date < today) return true
  if (a.date > today) return false
  const end = toMin(t.end) <= toMin(t.start) ? 24 * 60 : toMin(t.end)
  return now.getHours() * 60 + now.getMinutes() >= end
}

/** Shifts someone has worked, newest first, with hours and gross pay (CR-08). */
export function workedShifts(s: Data, e: Employee, now = new Date()): Worked[] {
  return s.assignments
    .filter((a) => a.employeeId === e.id && isActive(a) && isWorked(s, a, now))
    .map((a) => {
      const t = s.templates.find((x) => x.id === a.templateId)!
      const hours = hoursBetween(t.start, t.end)
      return { a, hours, amount: hours * e.hourlyRate }
    })
    .sort((x, y) => y.a.date.localeCompare(x.a.date))
}

export function sum(list: Worked[]) {
  return list.reduce((m, w) => ({ hours: m.hours + w.hours, amount: m.amount + w.amount, shifts: m.shifts + 1 }), { hours: 0, amount: 0, shifts: 0 })
}
