import { addDays, dayNumber, DAY_LONG, fmtDay, fmtRange, hoursBetween, startOfWeek, toMin, weekdayIndex } from './date'
import type { Assignment, Dept, ShiftTemplate, State } from './types'

export type ConflictKind = 'unavailable' | 'overlap' | 'maxHours' | 'elsewhere'
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

/** Runs the four scheduling checks: availability, overlap, max hours, assigned elsewhere. */
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
    } else if (a.date === req.date && (a.branchId !== req.branchId || a.dept !== req.dept)) {
      out.push({ kind: 'elsewhere', title: 'Assigned elsewhere', detail: `Working ${a.dept} · ${t.name} that day${where}.` })
    }
  }

  const ws = startOfWeek(req.date)
  const total = weekHours(s, emp.id, ws, req.ignoreId) + hoursBetween(tpl.start, tpl.end)
  if (total > emp.maxHours) {
    out.push({ kind: 'maxHours', title: 'Over max hours', detail: `This brings ${first} to ${total}h this week. Their limit is ${emp.maxHours}h.` })
  }
  return out
}
