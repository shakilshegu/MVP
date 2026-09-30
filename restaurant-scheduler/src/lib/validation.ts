import { addDays, dayNumber, DAY_LONG, fmtDay, fmtRange, hoursBetween, startOfWeek, toMin, weekdayIndex } from './date'
import type { Assignment, Dept, ShiftTemplate, State } from './types'

export type ConflictKind = 'unavailable' | 'overlap' | 'maxHours' | 'elsewhere' | 'rest' | 'dayMax'
export type Conflict = { kind: ConflictKind; title: string; detail: string }

export type AssignRequest = {
  branchId: string
  employeeId: string
  date: string
  templateId: string
  dept: Dept
  ignoreId?: string
}

export const isActive = (a: Assignment) => a.state !== 'removed'

export const MIN_REST_HOURS = 11
export const MAX_DAY_HOURS = 10

/** Staff needed for a shift on a given date, honouring per-weekday overrides. */
export const needFor = (t: ShiftTemplate, dept: Dept, date: string) => t.perDay?.[dept]?.[weekdayIndex(date)] ?? t.needed[dept]

/** Break required by German working-time law (ArbZG §4) for a shift of this length. */
export const breakMinutes = (hours: number) => (hours > 9 ? 45 : hours > 6 ? 30 : 0)

const hm = (mins: number) => `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`

function interval(date: string, t: ShiftTemplate): [number, number] {
  const base = dayNumber(date) * 1440
  const s = base + toMin(t.start)
  let e = base + toMin(t.end)
  if (e <= s) e += 1440
  return [s, e]
}

export function shiftHours(s: State, a: Pick<Assignment, 'templateId'>) {
  const t = s.templates.find((x) => x.id === a.templateId)
  return t ? hoursBetween(t.start, t.end) : 0
}

export function weekHours(s: State, employeeId: string, weekStart: string, ignoreId?: string) {
  const end = addDays(weekStart, 6)
  return s.assignments
    .filter((a) => a.employeeId === employeeId && isActive(a) && a.id !== ignoreId && a.date >= weekStart && a.date <= end)
    .reduce((sum, a) => sum + shiftHours(s, a), 0)
}

export function leaveOn(s: State, employeeId: string, date: string) {
  return s.leaves.find((l) => l.employeeId === employeeId && l.status === 'approved' && l.from <= date && l.to >= date)
}

/** Scheduling checks: availability, overlap, rest time, daily and weekly hours, assigned elsewhere. */
export function checkAssignment(s: State, req: AssignRequest): Conflict[] {
  const emp = s.employees.find((e) => e.id === req.employeeId)
  const tpl = s.templates.find((t) => t.id === req.templateId)
  if (!emp || !tpl) return []
  const first = emp.name.split(' ')[0]
  const out: Conflict[] = []

  const leave = leaveOn(s, emp.id, req.date)
  if (leave) {
    out.push({ kind: 'unavailable', title: 'On leave', detail: `${first} has approved ${leave.kind.toLowerCase()} leave ${fmtRange(leave.from, leave.to)}.` })
  } else if (!emp.availability[weekdayIndex(req.date)]) {
    out.push({ kind: 'unavailable', title: 'Unavailable', detail: `${first} is marked unavailable on ${DAY_LONG[weekdayIndex(req.date)]}s.` })
  }

  const [s0, e0] = interval(req.date, tpl)
  const nearby = s.assignments.filter(
    (a) =>
      a.employeeId === emp.id &&
      isActive(a) &&
      a.id !== req.ignoreId &&
      Math.abs(dayNumber(a.date) - dayNumber(req.date)) <= 1,
  )
  for (const a of nearby) {
    const t = s.templates.find((x) => x.id === a.templateId)
    if (!t) continue
    const [s1, e1] = interval(a.date, t)
    const where = a.branchId !== req.branchId ? ` at ${s.branches.find((b) => b.id === a.branchId)?.name}` : ''
    if (s0 < e1 && s1 < e0) {
      out.push({ kind: 'overlap', title: 'Overlapping shift', detail: `Already on ${t.name} ${t.start}–${t.end}, ${fmtDay(a.date)}${where}.` })
      continue
    }
    const gap = s0 >= e1 ? s0 - e1 : s1 - e0
    if (gap < MIN_REST_HOURS * 60) {
      out.push({
        kind: 'rest',
        title: 'Not enough rest',
        detail: `Only ${hm(gap)} between this and ${t.name} ${t.start}–${t.end}, ${fmtDay(a.date)}. German law requires ${MIN_REST_HOURS}h.`,
      })
    }
    if (a.date === req.date && (a.branchId !== req.branchId || a.dept !== req.dept)) {
      out.push({ kind: 'elsewhere', title: 'Assigned elsewhere', detail: `Working ${a.dept} · ${t.name} that day${where}.` })
    }
  }

  const dayTotal =
    s.assignments
      .filter((a) => a.employeeId === emp.id && isActive(a) && a.id !== req.ignoreId && a.date === req.date)
      .reduce((sum, a) => sum + shiftHours(s, a), 0) + hoursBetween(tpl.start, tpl.end)
  if (dayTotal > MAX_DAY_HOURS) {
    out.push({ kind: 'dayMax', title: 'Over 10 hours in a day', detail: `This makes ${dayTotal}h for ${first} on ${fmtDay(req.date)}. The legal maximum is ${MAX_DAY_HOURS}h.` })
  }

  const ws = startOfWeek(req.date)
  const total = weekHours(s, emp.id, ws, req.ignoreId) + hoursBetween(tpl.start, tpl.end)
  if (total > emp.maxHours) {
    out.push({ kind: 'maxHours', title: 'Over max hours', detail: `This brings ${first} to ${total}h this week. Their limit is ${emp.maxHours}h.` })
  }
  return out
}

export type WeekIssue = { kind: 'rest' | 'dayMax' | 'maxHours'; detail: string }

/** Working-time problems already on the schedule for one person in one week. */
export function weekIssues(s: State, employeeId: string, weekStart: string): WeekIssue[] {
  const emp = s.employees.find((e) => e.id === employeeId)
  if (!emp) return []
  const end = addDays(weekStart, 6)
  const mine = s.assignments
    .filter((a) => a.employeeId === employeeId && isActive(a) && a.date >= addDays(weekStart, -1) && a.date <= end)
    .map((a) => ({ a, t: s.templates.find((t) => t.id === a.templateId)! }))
    .filter((x) => x.t)
    .map((x) => ({ ...x, iv: interval(x.a.date, x.t) }))
    .sort((p, q) => p.iv[0] - q.iv[0])
  const out: WeekIssue[] = []
  for (let i = 1; i < mine.length; i++) {
    const prev = mine[i - 1]
    const cur = mine[i]
    const gap = cur.iv[0] - prev.iv[1]
    if (cur.a.date >= weekStart && gap >= 0 && gap < MIN_REST_HOURS * 60) {
      out.push({ kind: 'rest', detail: `${hm(gap)} rest before ${cur.t.name}, ${fmtDay(cur.a.date)}` })
    }
  }
  const byDay = new Map<string, number>()
  for (const x of mine) if (x.a.date >= weekStart) byDay.set(x.a.date, (byDay.get(x.a.date) ?? 0) + hoursBetween(x.t.start, x.t.end))
  for (const [d, h] of byDay) if (h > MAX_DAY_HOURS) out.push({ kind: 'dayMax', detail: `${h}h on ${fmtDay(d)}` })
  const total = weekHours(s, employeeId, weekStart)
  if (total > emp.maxHours) out.push({ kind: 'maxHours', detail: `${total}h of ${emp.maxHours}h max` })
  return out
}
