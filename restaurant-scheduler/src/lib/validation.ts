import { addDays, dayNumber, hoursBetween, startOfWeek, toMin, weekdayIndex } from './date'
import type { Assignment, ConflictKind, Dept, Leave, ShiftTemplate, State } from './types'

export type { ConflictKind } from './types'

/**
 * A rule problem as a code plus raw values. Rendering (and wording) happens in the UI,
 * so the same conflict reads correctly in any language.
 */
export type ConflictParams = {
  name: string
  /** For 'unavailable': whether it comes from approved leave or the weekly availability. */
  reason?: 'leave' | 'weekday'
  weekday?: number
  leaveKind?: Leave['kind']
  from?: string
  to?: string
  shift?: string
  start?: string
  end?: string
  date?: string
  branch?: string
  dept?: Dept
  restMinutes?: number
  total?: number
  max?: number
}
export type Conflict = { kind: ConflictKind; params: ConflictParams }

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
  const name = emp.name.split(' ')[0]
  const out: Conflict[] = []

  const leave = leaveOn(s, emp.id, req.date)
  if (leave) {
    out.push({ kind: 'unavailable', params: { name, reason: 'leave', leaveKind: leave.kind, from: leave.from, to: leave.to } })
  } else if (!emp.availability[weekdayIndex(req.date)]) {
    out.push({ kind: 'unavailable', params: { name, reason: 'weekday', weekday: weekdayIndex(req.date) } })
  }

  const [s0, e0] = interval(req.date, tpl)
  const nearby = s.assignments.filter(
    (a) => a.employeeId === emp.id && isActive(a) && a.id !== req.ignoreId && Math.abs(dayNumber(a.date) - dayNumber(req.date)) <= 1,
  )
  for (const a of nearby) {
    const t = s.templates.find((x) => x.id === a.templateId)
    if (!t) continue
    const [s1, e1] = interval(a.date, t)
    const other = { name, shift: t.name, start: t.start, end: t.end, date: a.date, branch: a.branchId !== req.branchId ? s.branches.find((b) => b.id === a.branchId)?.name : undefined }
    if (s0 < e1 && s1 < e0) {
      out.push({ kind: 'overlap', params: other })
      continue
    }
    const gap = s0 >= e1 ? s0 - e1 : s1 - e0
    if (gap < MIN_REST_HOURS * 60) out.push({ kind: 'rest', params: { ...other, restMinutes: gap } })
    if (a.date === req.date && (a.branchId !== req.branchId || a.dept !== req.dept)) out.push({ kind: 'elsewhere', params: { ...other, dept: a.dept } })
  }

  const dayTotal =
    s.assignments
      .filter((a) => a.employeeId === emp.id && isActive(a) && a.id !== req.ignoreId && a.date === req.date)
      .reduce((sum, a) => sum + shiftHours(s, a), 0) + hoursBetween(tpl.start, tpl.end)
  if (dayTotal > MAX_DAY_HOURS) out.push({ kind: 'dayMax', params: { name, total: dayTotal, max: MAX_DAY_HOURS, date: req.date } })

  const total = weekHours(s, emp.id, startOfWeek(req.date), req.ignoreId) + hoursBetween(tpl.start, tpl.end)
  if (total > emp.maxHours) out.push({ kind: 'maxHours', params: { name, total, max: emp.maxHours } })
  return out
}

export type WeekIssue =
  | { kind: 'rest'; restMinutes: number; shift: string; date: string }
  | { kind: 'dayMax'; hours: number; date: string }
  | { kind: 'maxHours'; total: number; max: number }

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
    const gap = mine[i].iv[0] - mine[i - 1].iv[1]
    if (mine[i].a.date >= weekStart && gap >= 0 && gap < MIN_REST_HOURS * 60) {
      out.push({ kind: 'rest', restMinutes: gap, shift: mine[i].t.name, date: mine[i].a.date })
    }
  }
  const byDay = new Map<string, number>()
  for (const x of mine) if (x.a.date >= weekStart) byDay.set(x.a.date, (byDay.get(x.a.date) ?? 0) + hoursBetween(x.t.start, x.t.end))
  for (const [date, hours] of byDay) if (hours > MAX_DAY_HOURS) out.push({ kind: 'dayMax', hours, date })
  const total = weekHours(s, employeeId, weekStart)
  if (total > emp.maxHours) out.push({ kind: 'maxHours', total, max: emp.maxHours })
  return out
}
