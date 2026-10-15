import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Backend } from '../data'
import { addDays, dayShort, fmtDay, fmtRange, daysInclusive, startOfWeek, todayKey, toMin, weekDays } from './date'
import { tr } from '../i18n/core'
import type { MsgKey } from '../i18n/core'
import { conflictTitles, deptName, describeSlot } from '../i18n/format'
import { createSeed, defaultChecklists, defaultDepartments, defaultTemplates } from './seed'
import { DEFAULT_COMPANY_SETTINGS } from './types'
import type { Announcement, Assignment, Company, CompanySettings, TimeWindow, Data, Department, Dept, Task, Branch, Employee, HistoryEntry, Leave, Manager, Perm, ShiftTemplate, State } from './types'
import { checkAssignment, isActive, neededAt, weekHours } from './validation'
import type { AssignRequest, Conflict } from './validation'

const uid = () => Math.random().toString(36).slice(2, 10)

export const DEFAULT_PERMS: Record<Perm, boolean> = { createEmployees: true, editShifts: true, publish: true, approveLeave: true, manageBranches: false }

export type Slot = { date: string; templateId: string; dept: Dept }
const sameSlot = (a: Pick<Assignment, 'date' | 'templateId' | 'dept' | 'branchId'>, b: Pick<Assignment, 'date' | 'templateId' | 'dept' | 'branchId'>) =>
  a.date === b.date && a.templateId === b.templateId && a.dept === b.dept && a.branchId === b.branchId

/**
 * Staffed shifts in departments that need a leader but have none (CR-01).
 * Checks the weeks that contain unpublished changes, from today on.
 */
export function missingLeaders(s: Data, branchId: string): (Slot & { branchId: string })[] {
  const today = todayKey()
  const needs = new Set(s.departments.filter((d) => d.needsLeader).map((d) => d.id))
  const changed = branchChanges(s, branchId)
  const weeks = new Set(changed.map((c) => startOfWeek(c.a.date)))
  const cells = new Map<string, Assignment[]>()
  for (const a of s.assignments) {
    if (a.branchId !== branchId || !isActive(a) || a.date < today || !weeks.has(startOfWeek(a.date)) || !needs.has(a.dept)) continue
    const k = `${a.date}|${a.templateId}|${a.dept}`
    cells.set(k, [...(cells.get(k) ?? []), a])
  }
  return [...cells.values()].filter((list) => !list.some((a) => a.isLeader)).map(([a]) => ({ date: a.date, templateId: a.templateId, dept: a.dept, branchId }))
}

/** Sets the leader flag; on a published shift the old value is kept so the change goes through Review & publish. */
export function withLeader(a: Assignment, on: boolean): Assignment {
  if (!!a.isLeader === on) return a
  return { ...a, isLeader: on, publishedLeader: a.state === 'published' ? (a.publishedLeader ?? !!a.isLeader) : undefined }
}

export type Change =
  | { kind: 'added'; a: Assignment }
  | { kind: 'removed'; a: Assignment }
  | { kind: 'moved'; from: Assignment; a: Assignment }
  | { kind: 'tasks'; a: Assignment; added: Task[]; removed: Task[] }
  | { kind: 'leader'; a: Assignment; on: boolean }

export function taskDiff(a: Assignment) {
  const pub = a.publishedTasks ?? []
  const cur = a.tasks ?? []
  return { added: cur.filter((t) => !pub.some((p) => p.id === t.id)), removed: pub.filter((p) => !cur.some((t) => t.id === p.id)) }
}

/**
 * Narrows all data to one company. Screens only ever receive this view, so data from
 * another company cannot leak into the UI by accident.
 */
export function scope(d: Data, companyId: string | null): State {
  const branches = d.branches.filter((b) => b.companyId === companyId)
  const branchIds = new Set(branches.map((b) => b.id))
  const employees = d.employees.filter((e) => branchIds.has(e.branchId))
  const employeeIds = new Set(employees.map((e) => e.id))
  return {
    ...d,
    companies: d.companies.filter((c) => c.id === companyId),
    branches,
    employees,
    managers: d.managers.filter((m) => m.companyId === companyId),
    templates: d.templates.filter((t) => t.companyId === companyId),
    departments: d.departments.filter((x) => x.companyId === companyId),
    checklists: d.checklists.filter((x) => x.companyId === companyId),
    assignments: d.assignments.filter((a) => branchIds.has(a.branchId)),
    leaves: d.leaves.filter((l) => employeeIds.has(l.employeeId)),
    history: d.history.filter((h) => branchIds.has(h.branchId)),
    announcements: d.announcements.filter((x) => branchIds.has(x.branchId)),
    notices: d.notices.filter((n) => n.companyId === companyId),
    perms: (companyId && d.companyPerms[companyId]) || DEFAULT_PERMS,
  }
}

export function branchChanges(s: Data, branchId: string): Change[] {
  const list = s.assignments.filter((a) => a.branchId === branchId && a.state !== 'published')
  const out: Change[] = []
  for (const a of s.assignments) {
    if (a.branchId !== branchId || a.state !== 'published') continue
    const d = taskDiff(a)
    if (d.added.length || d.removed.length) out.push({ kind: 'tasks', a, ...d })
    if (a.publishedLeader !== undefined && a.publishedLeader !== !!a.isLeader) out.push({ kind: 'leader', a, on: !!a.isLeader })
  }
  for (const a of list) {
    if (a.state === 'added' && a.movedFrom) {
      const from = s.assignments.find((x) => x.id === a.movedFrom)
      out.push(from ? { kind: 'moved', from, a } : { kind: 'added', a })
    } else if (a.state === 'added') out.push({ kind: 'added', a })
    else if (!a.movedTo) out.push({ kind: 'removed', a })
  }
  return out.sort((x, y) => x.a.date.localeCompare(y.a.date))
}

const describe = (s: Data, a: Pick<Assignment, 'templateId' | 'date' | 'dept'>) => describeSlot(tr, s, a)

type ToastAction = { label: string; run: () => void }
type Toast = { id: string; msg: string; action?: ToastAction; action2?: ToastAction }

function makeActions(get: () => Data, set: (s: Data) => void) {
  const me = () => get().managers.find((m) => m.id === get().session.userId)
  const bid = () => get().session.branchId ?? ''
  const cid = () => get().session.companyId ?? ''
  /** Same rule as `can()` in the UI, checked again here so every caller is held to it. */
  const allowed = (p: Perm) => {
    const m = me()
    return m != null && (m.role !== 'manager' || ((get().companyPerms[cid()] ?? DEFAULT_PERMS)[p] ?? false))
  }
  const empName = (id: string) => get().employees.find((e) => e.id === id)?.name ?? '—'
  const entry = (e: Omit<HistoryEntry, 'id' | 'at' | 'by' | 'branchId'>, branchId = bid()): HistoryEntry => ({
    id: uid(),
    at: new Date().toISOString(),
    by: me()?.name ?? 'System',
    branchId,
    ...e,
  })
  const patch = (fn: (s: Data) => Partial<Data>) => {
    const s = get()
    set({ ...s, ...fn(s) })
  }
  const log = (e: Omit<HistoryEntry, 'id' | 'at' | 'by' | 'branchId'>) => patch((s) => ({ history: [entry(e), ...s.history] }))

  return {
    /** Returns an error message key, or null when signed in. */
    login(email: string): MsgKey | null {
      const m = get().managers.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      if (!m) return 'auth.notFound'
      if (m.role === 'owner') {
        patch(() => ({ session: { userId: m.id, companyId: null, branchId: null } }))
        return null
      }
      const inCompany = get().branches.filter((b) => b.companyId === m.companyId)
      const branches = m.role === 'super' ? inCompany : inCompany.filter((b) => m.branchIds.includes(b.id))
      patch(() => ({ session: { userId: m.id, companyId: m.companyId, branchId: branches.length === 1 ? branches[0].id : null } }))
      return null
    },
    logout: () => patch(() => ({ session: { userId: null, companyId: null, branchId: null } })),
    selectBranch: (id: string | null) => patch((s) => ({ session: { ...s.session, branchId: id } })),
    /** Platform owner only: open a company in support view, or return to the platform (null). */
    selectCompany(id: string | null) {
      if (me()?.role !== 'owner') return
      const branches = get().branches.filter((b) => b.companyId === id)
      patch((s) => ({ session: { ...s.session, companyId: id, branchId: branches.length === 1 ? branches[0].id : null } }))
    },
    /** Platform owner only: a new company with its first branch and super admin. Returns an error key on failure. */
    addCompany(input: { name: string; branch: string; city: string; adminName: string; adminEmail: string }): Company | MsgKey {
      const s = get()
      if (me()?.role !== 'owner') return 'shell.noAccessBody'
      if (s.managers.some((m) => m.email.toLowerCase() === input.adminEmail.trim().toLowerCase())) return 'platform.errEmailTaken'
      const company: Company = { id: uid(), name: input.name.trim(), createdAt: new Date().toISOString(), currency: 'EUR' }
      const branch: Branch = { id: uid(), companyId: company.id, name: input.branch.trim(), address: '', city: input.city, opens: '10:00', closes: '23:00' }
      const admin: Manager = { id: uid(), companyId: company.id, name: input.adminName.trim(), email: input.adminEmail.trim(), role: 'super', branchIds: [branch.id] }
      set({
        ...s,
        companies: [...s.companies, company],
        branches: [...s.branches, branch],
        managers: [...s.managers, admin],
        templates: [...s.templates, ...defaultTemplates(company.id, uid)],
        departments: [...s.departments, ...defaultDepartments(company.id)],
        checklists: [...s.checklists, ...defaultChecklists(company.id)],
        companyPerms: { ...s.companyPerms, [company.id]: { ...DEFAULT_PERMS } },
      })
      return company
    },

    assign(req: AssignRequest, override?: Conflict[]): string {
      const s = get()
      const restored = s.assignments.find(
        (a) => a.state === 'removed' && !a.movedTo && a.employeeId === req.employeeId && a.date === req.date && a.templateId === req.templateId && a.dept === req.dept,
      )
      if (restored) {
        set({ ...s, assignments: s.assignments.map((a) => (a === restored ? { ...a, state: 'published' } : a)) })
        return restored.id
      }
      const a: Assignment = { id: uid(), branchId: req.branchId, employeeId: req.employeeId, date: req.date, templateId: req.templateId, dept: req.dept, state: 'added' }
      if (override?.length) a.overridden = override.map((c) => c.kind)
      set({ ...s, assignments: [...s.assignments, a] })
      return a.id
    },

    remove(id: string) {
      patch((s) => {
        const a = s.assignments.find((x) => x.id === id)
        if (!a) return {}
        if (a.state === 'added') {
          return {
            assignments: s.assignments
              .filter((x) => x.id !== id)
              .map((x) => (x.id === a.movedFrom ? { ...x, state: 'published' as const, movedTo: undefined } : x)),
          }
        }
        return { assignments: s.assignments.map((x) => (x.id === id ? { ...x, state: 'removed' as const } : x)) }
      })
    },

    undoRemove(id: string) {
      patch((s) => {
        const a = s.assignments.find((x) => x.id === id)
        if (!a) return {}
        return {
          assignments: s.assignments
            .filter((x) => x.id !== a.movedTo)
            .map((x) => (x.id === id ? { ...x, state: 'published' as const, movedTo: undefined } : x)),
        }
      })
    },

    move(id: string, to: { date: string; templateId: string; dept: Assignment['dept'] }, override?: Conflict[]) {
      patch((s) => {
        const a = s.assignments.find((x) => x.id === id)
        if (!a || a.state === 'removed') return {}
        const overridden = override?.length ? override.map((c) => c.kind) : undefined
        if (a.state === 'added') {
          return { assignments: s.assignments.map((x) => (x.id === id ? { ...x, ...to, overridden } : x)) }
        }
        const next: Assignment = { ...a, ...to, id: uid(), state: 'added', movedFrom: a.id, overridden }
        return {
          assignments: [...s.assignments.map((x) => (x.id === id ? { ...x, state: 'removed' as const, movedTo: next.id } : x)), next],
        }
      })
    },

    discardChanges() {
      const b = bid()
      patch((s) => ({
        assignments: s.assignments
          .filter((a) => !(a.branchId === b && a.state === 'added'))
          .map((a) => (a.branchId === b && a.state === 'removed' ? { ...a, state: 'published' as const, movedTo: undefined } : a))
          .map((a) => (a.branchId === b ? { ...a, tasks: a.publishedTasks } : a))
          .map((a) => (a.branchId === b && a.publishedLeader !== undefined ? { ...a, isLeader: a.publishedLeader, publishedLeader: undefined } : a)),
        pendingApproval: { ...s.pendingApproval, [b]: false },
      }))
    },

    /** Super admins only: company-wide Employee App rules. */
    saveCompanySettings(next: Partial<CompanySettings>) {
      if (me()?.role === 'manager') return
      patch((d) => ({
        companies: d.companies.map((c) => (c.id === cid() ? { ...c, settings: { ...DEFAULT_COMPANY_SETTINGS, ...c.settings, ...next } } : c)),
      }))
    },

    /** Undoes unpublished leader changes on a shift, restoring whoever led it before. */
    revertLeader(id: string) {
      patch((s) => {
        const target = s.assignments.find((a) => a.id === id)
        if (!target) return {}
        return {
          assignments: s.assignments.map((a) =>
            sameSlot(a, target) && a.publishedLeader !== undefined ? { ...a, isLeader: a.publishedLeader, publishedLeader: undefined } : a,
          ),
        }
      })
    },

    copyWeek(fromStart: string, toStart: string) {
      if (!allowed('editShifts')) return { added: 0, skipped: 0 }
      const s = get()
      const b = bid()
      const draft: Data = { ...s, assignments: [...s.assignments] }
      let added = 0
      let skipped = 0
      const source = s.assignments.filter((a) => a.branchId === b && isActive(a) && a.date >= fromStart && a.date <= addDays(fromStart, 6))
      for (const a of source) {
        const date = addDays(toStart, Math.round((Date.parse(a.date) - Date.parse(fromStart)) / 86400000))
        const req = { branchId: b, employeeId: a.employeeId, date, templateId: a.templateId, dept: a.dept }
        const exists = draft.assignments.some((x) => isActive(x) && x.employeeId === a.employeeId && x.date === date && x.templateId === a.templateId)
        if (exists) continue
        if (checkAssignment(draft, req).length) {
          skipped++
          continue
        }
        draft.assignments.push({ id: uid(), ...req, state: 'added' })
        added++
      }
      set(draft)
      return { added, skipped }
    },

    /** Fills open slots as drafts with people who pass every check. */
    autoFill(weekStart: string, depts: Dept[]) {
      if (!allowed('editShifts')) return { ids: [] as string[], open: 0 }
      const s = get()
      const b = bid()
      const today = todayKey()
      const pref = { morning: 'Mornings', day: 'Days', evening: 'Evenings', night: 'Nights' } as const
      const draft: Data = { ...s, assignments: [...s.assignments] }
      const ids: string[] = []
      let open = 0
      const tpls = s.templates.filter((t) => t.companyId === cid()).sort((x, y) => toMin(x.start) - toMin(y.start))
      for (const date of weekDays(weekStart)) {
        if (date < today) continue
        for (const t of tpls)
          for (const dept of depts) {
            const have = draft.assignments.filter((a) => a.branchId === b && isActive(a) && a.date === date && a.templateId === t.id && a.dept === dept).length
            let need = neededAt(s, b, t, dept, date) - have
            if (need <= 0) continue
            const pool = draft.employees
              .filter((e) => e.branchId === b && e.skills.includes(dept) && e.status === 'active')
              .map((e) => ({ e, prefers: e.preferred === pref[t.tone], load: weekHours(draft, e.id, weekStart) / e.maxHours }))
              .sort((p, q) => Number(q.prefers) - Number(p.prefers) || p.load - q.load)
            for (const { e } of pool) {
              if (need <= 0) break
              const req = { branchId: b, employeeId: e.id, date, templateId: t.id, dept }
              if (checkAssignment(draft, req).length) continue
              const id = uid()
              draft.assignments.push({ id, ...req, state: 'added' })
              ids.push(id)
              need--
            }
            open += Math.max(0, need)
            const cell = draft.assignments.filter((a) => a.branchId === b && isActive(a) && a.date === date && a.templateId === t.id && a.dept === dept)
            const needsLeader = s.departments.find((d) => d.id === dept)?.needsLeader
            if (needsLeader && cell.length && !cell.some((a) => a.isLeader)) {
              const lead = [...cell].sort((x, y) => (draft.employees.find((e) => e.id === y.employeeId)?.hourlyRate ?? 0) - (draft.employees.find((e) => e.id === x.employeeId)?.hourlyRate ?? 0))[0]
              draft.assignments = draft.assignments.map((a) => (a.id === lead.id ? withLeader(a, true) : a))
            }
          }
      }
      set(draft)
      return { ids, open }
    },
    /** Makes this person the shift leader for their department in this shift, replacing any other (CR-01). */
    setLeader(id: string, on: boolean) {
      patch((s) => {
        const target = s.assignments.find((a) => a.id === id)
        if (!target) return {}
        return {
          assignments: s.assignments.map((a) => (a.id === id ? withLeader(a, on) : on && sameSlot(a, target) ? withLeader(a, false) : a)),
        }
      })
    },

    /** Gives each listed shift a leader: the best-paid person working it. Returns how many were set. */
    autoLeaders(slots: (Slot & { branchId: string })[]) {
      const s = get()
      const rate = (a: Assignment) => s.employees.find((e) => e.id === a.employeeId)?.hourlyRate ?? 0
      const picks = new Set(
        slots
          .map((slot) => s.assignments.filter((a) => isActive(a) && sameSlot(a, slot)).sort((x, y) => rate(y) - rate(x))[0]?.id)
          .filter(Boolean),
      )
      set({ ...s, assignments: s.assignments.map((a) => (picks.has(a.id) ? withLeader(a, true) : a)) })
      return picks.size
    },

    removeMany: (ids: string[]) => patch((s) => ({ assignments: s.assignments.filter((a) => !ids.includes(a.id)) })),

    sendForApproval() {
      const b = bid()
      const branch = get().branches.find((x) => x.id === b)
      patch((s) => ({
        pendingApproval: { ...s.pendingApproval, [b]: true },
        notices: [
          { id: uid(), companyId: cid(), at: new Date().toISOString(), kind: 'approvalRequested', params: { name: me()?.name ?? '', branch: branch?.name ?? '', changes: branchChanges(s, b).length }, read: false, href: '/review' },
          ...s.notices,
        ],
      }))
    },

    publish() {
      const s = get()
      const b = bid()
      const changes = branchChanges(s, b)
      const notified = [...new Set(changes.flatMap((c) => (c.kind === 'moved' ? [c.a.employeeId, c.from.employeeId] : [c.a.employeeId])))]
      const taskNote = (x: Assignment) => (x.tasks?.length ? ` · ${tr('history.detail.tasks', { list: x.tasks.map((t) => t.text).join(', ') })}` : '')
      const overrideNote = (x: Assignment) => (x.overridden?.length ? ` (${tr('history.detail.override', { list: conflictTitles(tr, x.overridden) })})` : '')
      const logs: HistoryEntry[] = changes.map((c) =>
        c.kind === 'tasks'
          ? entry({ action: 'tasksUpdated', subject: empName(c.a.employeeId), to: `${[...c.added.map((t) => `+ ${t.text}`), ...c.removed.map((t) => `− ${t.text}`)].join(', ')} · ${describe(s, c.a)}` })
          : c.kind === 'added'
            ? entry({ action: 'assigned', subject: empName(c.a.employeeId), to: describe(s, c.a) + overrideNote(c.a) + taskNote(c.a) })
            : c.kind === 'removed'
              ? entry({ action: 'removed', subject: empName(c.a.employeeId), from: describe(s, c.a) })
              : c.kind === 'leader'
                ? entry({ action: 'leader', subject: empName(c.a.employeeId), to: `${tr(c.on ? 'history.detail.leaderOn' : 'history.detail.leaderOff')} · ${describe(s, c.a)}` })
                : entry({ action: 'moved', subject: empName(c.a.employeeId), from: describe(s, c.from), to: describe(s, c.a) }),
      )
      logs.unshift(entry({ action: 'published', subject: '', count: changes.length, people: notified.length }))
      const at = new Date().toISOString()
      set({
        ...s,
        assignments: s.assignments
          .filter((a) => !(a.branchId === b && a.state === 'removed'))
          .map((a) => (a.branchId === b && a.state === 'added' ? { ...a, state: 'published' as const, movedFrom: undefined } : a))
          .map((a) => (a.branchId === b ? { ...a, publishedTasks: a.tasks, publishedLeader: undefined } : a)),
        history: [...logs, ...s.history],
        pendingApproval: { ...s.pendingApproval, [b]: false },
        lastPublish: { branchId: b, at, count: changes.length, notified },
        notices: [
          { id: uid(), companyId: cid(), at, kind: 'published', params: { changes: changes.length, people: notified.length }, read: true, href: '/history' },
          ...s.notices,
        ],
      })
      return notified
    },

    saveEmployee(data: Omit<Employee, 'id' | 'branchId'> & { id?: string }): Employee {
      const s = get()
      const existing = data.id ? s.employees.find((e) => e.id === data.id) : undefined
      if (existing) {
        const next = { ...existing, ...data }
        set({ ...s, employees: s.employees.map((e) => (e.id === next.id ? next : e)), history: [entry({ action: 'employeeEdited', subject: next.name, to: `${deptName(s, next.dept)} · ${next.position}` }), ...s.history] })
        return next
      }
      const e: Employee = { ...data, id: uid(), branchId: bid() }
      set({
        ...s,
        employees: [...s.employees, e],
        history: [entry({ action: 'employeeAdded', subject: e.name, to: `${deptName(s, e.dept)} · ${e.position}${e.status === 'invited' ? ` · ${tr('history.detail.inviteSent')}` : ''}` }), ...s.history],
      })
      return e
    },

    setAvailability(id: string, day: number, value: boolean) {
      const e = get().employees.find((x) => x.id === id)
      if (!e) return
      const availability = e.availability.map((v, i) => (i === day ? value : v))
      patch((s) => ({ employees: s.employees.map((x) => (x.id === id ? { ...x, availability } : x)) }))
      const d = dayShort(day)
      const state = (on: boolean) => tr(on ? 'common.available' : 'common.unavailable')
      log({ action: 'availability', subject: e.name, from: `${d}: ${state(!value)}`, to: `${d}: ${state(value)}` })
    },

    /** Sets or clears the hours someone is available on a weekday of their usual week. */
    setAvailTime(id: string, day: number, w: TimeWindow | null) {
      const e = get().employees.find((x) => x.id === id && x.branchId === bid())
      if (!e) return
      const availTimes = Array.from({ length: 7 }, (_, i) => (i === day ? w : (e.availTimes?.[i] ?? null)))
      patch((s) => ({ employees: s.employees.map((x) => (x.id === id ? { ...x, availTimes } : x)) }))
      log({ action: 'availability', subject: e.name, to: `${dayShort(day)}: ${w ? `${w.from}–${w.to}` : tr('availability.anyTime')}` })
    },

    /** Changes one day for one specific week only, leaving the usual pattern alone (CR-07). */
    setWeekAvailability(id: string, weekStart: string, day: number, value: boolean) {
      const s = get()
      const e = s.employees.find((x) => x.id === id)
      if (!e) return
      const days = (s.weekAvailability[id]?.[weekStart] ?? e.availability).map((v, i) => (i === day ? value : v))
      const same = days.every((v, i) => v === e.availability[i])
      const weeks = { ...(s.weekAvailability[id] ?? {}) }
      if (same) delete weeks[weekStart]
      else weeks[weekStart] = days
      patch((d) => ({ weekAvailability: { ...d.weekAvailability, [id]: weeks } }))
      const label = fmtDay(addDays(weekStart, day))
      const state = (on: boolean) => tr(on ? 'common.available' : 'common.unavailable')
      log({ action: 'availability', subject: e.name, from: `${label}: ${state(!value)}`, to: `${label}: ${state(value)}` })
    },

    /** Drops a week's override so the usual pattern applies again. */
    resetWeekAvailability(id: string, weekStart: string) {
      patch((d) => {
        const weeks = { ...(d.weekAvailability[id] ?? {}) }
        delete weeks[weekStart]
        return { weekAvailability: { ...d.weekAvailability, [id]: weeks } }
      })
    },

    setPreferred(id: string, preferred: Employee['preferred']) {
      patch((s) => ({ employees: s.employees.map((x) => (x.id === id ? { ...x, preferred } : x)) }))
    },

    decideLeave(id: string, status: 'approved' | 'declined') {
      if (!allowed('approveLeave')) return
      const l = get().leaves.find((x) => x.id === id)
      if (!l) return
      const emp = get().employees.find((e) => e.id === l.employeeId)
      const log = entry(
        {
          action: status === 'approved' ? 'leaveApproved' : 'leaveDeclined',
          subject: emp?.name ?? '',
          to: `${tr(`leaveKind.${l.kind}`)} · ${fmtRange(l.from, l.to)} (${tr('common.days', { count: daysInclusive(l.from, l.to) })})`,
        },
        emp?.branchId,
      )
      patch((s) => ({ leaves: s.leaves.map((x) => (x.id === id ? { ...x, status } : x)), history: [log, ...s.history] }))
      // Undo from the toast: back to pending, and the decision drops out of History.
      return () => patch((s) => ({ leaves: s.leaves.map((x) => (x.id === id ? { ...x, status: 'pending' as const } : x)), history: s.history.filter((h) => h.id !== log.id) }))
    },

    saveTemplate(input: ShiftTemplate) {
      const s = get()
      const old = s.templates.find((x) => x.id === input.id)
      const t = { ...input, companyId: old?.companyId ?? cid() }
      set({
        ...s,
        templates: old ? s.templates.map((x) => (x.id === t.id ? t : x)) : [...s.templates, t],
        history: [
          old
            ? entry({ action: 'shiftEdited', subject: t.name, from: `${old.name} ${old.start}–${old.end}`, to: `${t.name} ${t.start}–${t.end}` })
            : entry({ action: 'shiftCreated', subject: t.name, to: `${t.start}–${t.end}` }),
          ...s.history,
        ],
      })
    },
    deleteTemplate: (id: string) =>
      patch((s) =>
        s.templates.find((t) => t.id === id)?.companyId === cid()
          ? { templates: s.templates.filter((t) => t.id !== id), assignments: s.assignments.filter((a) => a.templateId !== id) }
          : {},
      ),

    addTask(assignmentId: string, text: string) {
      const t = text.trim()
      if (!t) return
      patch((s) => ({
        assignments: s.assignments.map((x) => (x.id === assignmentId ? { ...x, tasks: [...(x.tasks ?? []), { id: uid(), text: t, done: false }] } : x)),
      }))
    },
    toggleTask(assignmentId: string, taskId: string) {
      patch((s) => ({
        assignments: s.assignments.map((x) =>
          x.id === assignmentId ? { ...x, tasks: x.tasks?.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) } : x,
        ),
      }))
    },
    /** Ticks or unticks a checklist item or task on a shift, on the employee's behalf (CR-04). Current branch only. */
    tickItem(assignmentId: string, itemId: string, on: boolean) {
      const s = get()
      const x = s.assignments.find((y) => y.id === assignmentId && y.branchId === bid())
      if (!x) return
      const by = s.managers.find((m) => m.id === s.session.userId)?.name ?? '—'
      patch((d) => {
        const shift = { ...(d.ticks[x.id] ?? {}) }
        if (on) shift[itemId] = { at: new Date().toISOString(), by, byManager: true }
        else delete shift[itemId]
        return {
          ticks: { ...d.ticks, [x.id]: shift },
          assignments: d.assignments.map((y) => (y.id === x.id ? { ...y, tasks: y.tasks?.map((t) => (t.id === itemId ? { ...t, done: on } : t)) } : y)),
        }
      })
    },

    revertTasks(assignmentId: string) {
      patch((s) => ({ assignments: s.assignments.map((x) => (x.id === assignmentId ? { ...x, tasks: x.publishedTasks } : x)) }))
    },
    removeTask(assignmentId: string, taskId: string) {
      patch((s) => ({
        assignments: s.assignments.map((x) => (x.id === assignmentId ? { ...x, tasks: x.tasks?.filter((t) => t.id !== taskId) } : x)),
      }))
    },

    /** Creates or updates an announcement and "sends" it to the branch's active staff. Returns how many were told. */
    saveAnnouncement(input: Omit<Announcement, 'id' | 'branchId' | 'by' | 'at' | 'sentTo'> & { id?: string }) {
      const s = get()
      const sentTo = s.employees.filter((e) => e.branchId === bid() && e.status === 'active').length
      const by = s.managers.find((m) => m.id === s.session.userId)?.name ?? '—'
      // Only announcements of the current branch can be edited; an unknown id creates a new one.
      const prev = input.id ? s.announcements.find((x) => x.id === input.id && x.branchId === bid()) : undefined
      const next: Announcement = { ...input, id: prev?.id ?? uid(), branchId: bid(), by, at: new Date().toISOString(), sentTo }
      patch((d) => ({
        announcements: prev ? d.announcements.map((x) => (x.id === prev.id && x.branchId === prev.branchId ? next : x)) : [...d.announcements, next],
        history: [entry({ action: 'announcement', subject: next.title, from: prev ? prev.title : undefined, to: fmtDay(next.date) }), ...d.history],
      }))
      return sentTo
    },

    deleteAnnouncement(id: string) {
      const b = bid()
      patch((d) => ({ announcements: d.announcements.filter((x) => !(x.id === id && x.branchId === b)) }))
    },

    setDayNote(date: string, text: string) {
      const key = `${bid()}|${date}`
      patch((s) => {
        const dayNotes = { ...s.dayNotes }
        if (text.trim()) dayNotes[key] = text.trim()
        else delete dayNotes[key]
        return { dayNotes }
      })
    },

    /** Emails are logins, so they must be unique across every company. */
    isEmailFree(email: string, exceptId?: string) {
      const e = email.trim().toLowerCase()
      const s = get()
      return !s.managers.some((m) => m.email.toLowerCase() === e) && !s.employees.some((x) => x.id !== exceptId && x.email.toLowerCase() === e)
    },

    saveDepartment(d: Omit<Department, 'id' | 'companyId'> & { id?: string }) {
      const s = get()
      if (d.id) {
        set({ ...s, departments: s.departments.map((x) => (x.id === d.id && x.companyId === cid() ? { ...x, ...d } : x)) })
        return
      }
      set({ ...s, departments: [...s.departments, { ...d, id: uid(), companyId: cid() }] })
    },
    /** How many people, shifts and staffing rules use a department. It can only be deleted when this is 0. */
    departmentUse(id: string) {
      const s = get()
      return s.employees.filter((e) => e.skills.includes(id)).length + s.assignments.filter((a) => a.dept === id && a.state !== 'removed').length
    },
    deleteDepartment(id: string) {
      const all = get().departments
      const removed = all.find((x) => x.id === id && x.companyId === cid())
      const at = all.indexOf(removed!)
      const undo = () => removed && patch((s) => ({ departments: [...s.departments.slice(0, at), removed, ...s.departments.slice(at)] }))
      patch((s) => ({
        departments: s.departments.filter((x) => !(x.id === id && x.companyId === cid())),
        templates: s.templates.map((t) => {
          if (t.companyId !== cid()) return t
          const needed = { ...t.needed }
          delete needed[id]
          const perDay = t.perDay ? { ...t.perDay } : undefined
          if (perDay) delete perDay[id]
          return { ...t, needed, perDay }
        }),
      }))
      return undo
    },
    moveDepartment(id: string, dir: -1 | 1) {
      patch((s) => {
        const mine = s.departments.filter((x) => x.companyId === cid())
        const i = mine.findIndex((x) => x.id === id)
        const j = i + dir
        if (i < 0 || j < 0 || j >= mine.length) return {}
        ;[mine[i], mine[j]] = [mine[j], mine[i]]
        return { departments: [...s.departments.filter((x) => x.companyId !== cid()), ...mine] }
      })
    },

    markRead: (id?: string) => patch((s) => ({ notices: s.notices.map((n) => (!id || n.id === id ? { ...n, read: true } : n)) })),

    setPerm(p: Perm, v: boolean) {
      patch((s) => ({ companyPerms: { ...s.companyPerms, [cid()]: { ...(s.companyPerms[cid()] ?? DEFAULT_PERMS), [p]: v } } }))
      log({ action: 'permissions', subject: tr('history.detail.managers'), to: tr(v ? 'history.detail.permOn' : 'history.detail.permOff', { perm: tr(`perm.${p}.label`) }) })
    },
    setManagerBranch(managerId: string, branchId: string, on: boolean) {
      patch((s) => ({
        managers: s.managers.map((m) =>
          m.id === managerId ? { ...m, branchIds: on ? [...new Set([...m.branchIds, branchId])] : m.branchIds.filter((x) => x !== branchId) } : m,
        ),
      }))
    },
    saveBranch(b: Omit<Branch, 'id' | 'companyId'> & { id?: string }) {
      const s = get()
      if (b.id) {
        set({ ...s, branches: s.branches.map((x) => (x.id === b.id && x.companyId === cid() ? { ...x, ...b } : x)) })
        return
      }
      const nb: Branch = { ...b, id: uid(), companyId: cid() }
      set({ ...s, branches: [...s.branches, nb], history: [entry({ action: 'branch', subject: nb.name, to: tr('history.detail.branchAdded') }, nb.id), ...s.history] })
    },
    saveManager(m: Manager) {
      patch((s) => ({ managers: s.managers.map((x) => (x.id === m.id ? m : x)) }))
    },
    reset() {
      const fresh = createSeed()
      set({ ...fresh, session: get().session })
    },
  }
}

export type Actions = ReturnType<typeof makeActions>

export type CompanySummary = { company: Company; branches: number; staff: number; admins: Manager[] }

type Ctx = {
  /** The current company's data only. */
  s: State
  a: Actions
  me: Manager | null
  company: Company | null
  isOwner: boolean
  /** The current company's departments, in schedule order. */
  depts: Department[]
  /** Hourly pay is visible to admins only (and to the employee themselves). */
  canSeePay: boolean
  /** Platform owner only: every company with headline numbers. Empty for everyone else. */
  platform: CompanySummary[]
  branch: Branch | null
  myBranches: Branch[]
  can: (p: Perm) => boolean
  toast: (msg: string, action?: ToastAction, action2?: ToastAction) => void
  pendingLeave: Leave[]
}

const StoreCtx = createContext<Ctx | null>(null)
const ToastCtx = createContext<{ toasts: Toast[]; dismiss: (id: string) => void }>({ toasts: [], dismiss: () => {} })

type Boot = { status: 'loading' } | { status: 'error'; message: string; retry: () => void }

export function StoreProvider({
  backend,
  fallback,
  children,
}: {
  backend: Backend
  /** Shown until data has loaded, or when loading fails. */
  fallback: (boot: Boot) => ReactNode
  children: ReactNode
}) {
  const [s, setS] = useState<Data | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const ref = useRef<Data | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    let live = true
    setFailure(null)
    backend
      .load()
      .then((d) => {
        if (!live) return
        ref.current = d
        setS(d)
      })
      .catch((e: unknown) => live && setFailure(e instanceof Error ? e.message : String(e)))
    return () => {
      live = false
    }
  }, [backend, attempt])

  useEffect(() => {
    if (s) backend.save(s)
  }, [s, backend])

  const a = useMemo(
    () =>
      makeActions(
        () => ref.current!,
        (next) => {
          ref.current = next
          setS(next)
        },
      ),
    [],
  )

  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback(
    (msg: string, action?: ToastAction, action2?: ToastAction) => {
      const id = uid()
      setToasts((t) => [...t.slice(-2), { id, msg, action, action2 }])
      setTimeout(() => dismiss(id), action ? 6000 : 3500)
    },
    [dismiss],
  )

  const value = useMemo<Ctx | null>(() => {
    if (!s) return null
    const me = s.managers.find((m) => m.id === s.session.userId) ?? null
    const isOwner = me?.role === 'owner'
    const view = scope(s, s.session.companyId)
    const myBranches = me ? (me.role === 'manager' ? view.branches.filter((b) => me.branchIds.includes(b.id)) : view.branches) : []
    const branch = myBranches.find((b) => b.id === s.session.branchId) ?? null
    const branchEmp = new Set(view.employees.filter((e) => e.branchId === branch?.id).map((e) => e.id))
    const platform: CompanySummary[] = isOwner
      ? s.companies.map((company) => {
          const ids = new Set(s.branches.filter((b) => b.companyId === company.id).map((b) => b.id))
          return {
            company,
            branches: ids.size,
            staff: s.employees.filter((e) => ids.has(e.branchId)).length,
            admins: s.managers.filter((m) => m.companyId === company.id && m.role === 'super'),
          }
        })
      : []
    return {
      s: view,
      a,
      me,
      company: view.companies[0] ?? null,
      isOwner,
      depts: view.departments,
      canSeePay: me != null && me.role !== 'manager',
      platform,
      branch,
      myBranches,
      can: (p) => (me != null && me.role !== 'manager') || view.perms[p],
      toast,
      pendingLeave: view.leaves.filter((l) => l.status === 'pending' && branchEmp.has(l.employeeId)),
    }
  }, [s, a, toast])

  if (!value) return <>{fallback(failure ? { status: 'error', message: failure, retry: () => setAttempt((n) => n + 1) } : { status: 'loading' })}</>

  return (
    <StoreCtx.Provider value={value}>
      <ToastCtx.Provider value={{ toasts, dismiss }}>{children}</ToastCtx.Provider>
    </StoreCtx.Provider>
  )
}

export function useStore() {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('useStore outside StoreProvider')
  return c
}
export const useToasts = () => useContext(ToastCtx)
