import { addDays, dayNumber, hoursBetween, startOfWeek, toMin, weekdayIndex } from './date'
import type { Assignment, ConflictKind, Data, Dept, Employee, Leave, ShiftTemplate, TimeWindow } from './types'

export type { ConflictKind } from './types'

/**
 * A rule problem as a code plus raw values. Rendering (and wording) happens in the UI,
 * so the same conflict reads correctly in any language.
 */
export type ConflictParams = {
  name: string
  /** For 'unavailable': whether it comes from approved leave or the weekly availability. */
  reason?: 'leave' | 'weekday' | 'week' | 'hours'
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
  deptName?: string
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

/** Extra people asked for by announcements on this shift (CR-05). */
export const extraFor = (s: Pick<Data, 'announcements'>, branchId: string, templateId: string, dept: Dept, date: string) =>
  s.announcements.filter((x) => x.branchId === branchId && x.date === date && x.templateId === templateId && x.dept === dept).reduce((n, x) => n + (x.extraStaff ?? 0), 0)

/** Staff needed including announcement extras: what the schedule shows and auto-fill aims for. */
export const neededAt = (s: Pick<Data, 'announcements'>, branchId: string, t: ShiftTemplate, dept: Dept, date: string) => needFor(t, dept, date) + extraFor(s, branchId, t.id, dept, date)

/** Staff needed for a shift on a given date, honouring per-weekday overrides. */
export const needFor = (t: ShiftTemplate, dept: Dept, date: string) => t.perDay?.[dept]?.[weekdayIndex(date)] ?? t.needed[dept] ?? 0

/** Break required by German working-time law (ArbZG §4) for a shift of this length. */
export const breakMinutes = (hours: number) => (hours > 9 ? 45 : hours > 6 ? 30 : 0)

function interval(date: string, t: ShiftTemplate): [number, number] {
  const base = dayNumber(date) * 1440
  const s = base + toMin(t.start)
  let e = base + toMin(t.end)
  if (e <= s) e += 1440
  return [s, e]
}

export function shiftHours(s: Data, a: Pick<Assignment, 'templateId'>) {
  const t = s.templates.find((x) => x.id === a.templateId)
  return t ? hoursBetween(t.start, t.end) : 0
}

export function weekHours(s: Data, employeeId: string, weekStart: string, ignoreId?: string) {
  const end = addDays(weekStart, 6)
  return s.assignments
    .filter((a) => a.employeeId === employeeId && isActive(a) && a.id !== ignoreId && a.date >= weekStart && a.date <= end)
    .reduce((sum, a) => sum + shiftHours(s, a), 0)
}

/** The days someone can work in a given week: that week's override, or their usual pattern. */
export function weekPattern(s: Data, e: Employee, weekStart: string) {
  return s.weekAvailability[e.id]?.[weekStart] ?? e.availability
}

/** Whether a shift lies inside someone's available hours. */
export function fitsWindow(w: TimeWindow, start: string, end: string) {
  const ws = toMin(w.from)
  let we = toMin(w.to)
  if (we <= ws) we += 1440
  const ss = toMin(start)
  let se = toMin(end)
  if (se <= ss) se += 1440
  return ss >= ws && se <= we
}

export const availableOn = (s: Data, e: Employee, date: string) => weekPattern(s, e, startOfWeek(date))[weekdayIndex(date)]

export function leaveOn(s: Data, employeeId: string, date: string) {
  return s.leaves.find((l) => l.employeeId === employeeId && l.status === 'approved' && l.from <= date && l.to >= date)
}

/** Scheduling checks: availability, overlap, rest time, daily and weekly hours, assigned elsewhere. */
export function checkAssignment(s: Data, req: AssignRequest): Conflict[] {
  const emp = s.employees.find((e) => e.id === req.employeeId)
  const tpl = s.templates.find((t) => t.id === req.templateId)
  if (!emp || !tpl) return []
  const name = emp.name.split(' ')[0]
  const out: Conflict[] = []

  const leave = leaveOn(s, emp.id, req.date)
  if (leave) {
    out.push({ kind: 'unavailable', params: { name, reason: 'leave', leaveKind: leave.kind, from: leave.from, to: leave.to } })
  } else if (!availableOn(s, emp, req.date)) {
    const override = s.weekAvailability[emp.id]?.[startOfWeek(req.date)] != null
    out.push({ kind: 'unavailable', params: { name, reason: override ? 'week' : 'weekday', weekday: weekdayIndex(req.date), date: req.date } })
  } else {
    const w = emp.availTimes?.[weekdayIndex(req.date)]
    if (w && !fitsWindow(w, tpl.start, tpl.end)) out.push({ kind: 'unavailable', params: { name, reason: 'hours', weekday: weekdayIndex(req.date), from: w.from, to: w.to } })
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
    if (a.date === req.date && (a.branchId !== req.branchId || a.dept !== req.dept)) out.push({ kind: 'elsewhere', params: { ...other, dept: a.dept, deptName: s.departments.find((d) => d.id === a.dept)?.name } })
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
export function weekIssues(s: Data, employeeId: string, weekStart: string): WeekIssue[] {
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
