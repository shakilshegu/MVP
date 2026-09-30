import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { addDays, dayShort, fmtRange, daysInclusive, todayKey, toMin, weekDays } from './date'
import { tr } from '../i18n/core'
import type { MsgKey } from '../i18n/core'
import { conflictTitles, deptName, describeSlot } from '../i18n/format'
import { createSeed } from './seed'
import type { Assignment, Dept, Task, Branch, Employee, HistoryEntry, Leave, Manager, Perm, ShiftTemplate, State } from './types'
import { checkAssignment, isActive, needFor, weekHours } from './validation'
import type { AssignRequest, Conflict } from './validation'

const KEY = 'rota-state-v7'
const uid = () => Math.random().toString(36).slice(2, 10)

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as State
      if (s.version === 7) return s
    }
  } catch {
    /* fall through to seed */
  }
  return createSeed()
}

export type Change =
  | { kind: 'added'; a: Assignment }
  | { kind: 'removed'; a: Assignment }
  | { kind: 'moved'; from: Assignment; a: Assignment }
  | { kind: 'tasks'; a: Assignment; added: Task[]; removed: Task[] }

export function taskDiff(a: Assignment) {
  const pub = a.publishedTasks ?? []
  const cur = a.tasks ?? []
  return { added: cur.filter((t) => !pub.some((p) => p.id === t.id)), removed: pub.filter((p) => !cur.some((t) => t.id === p.id)) }
}

export function branchChanges(s: State, branchId: string): Change[] {
  const list = s.assignments.filter((a) => a.branchId === branchId && a.state !== 'published')
  const out: Change[] = []
  for (const a of s.assignments) {
    if (a.branchId !== branchId || a.state !== 'published') continue
    const d = taskDiff(a)
    if (d.added.length || d.removed.length) out.push({ kind: 'tasks', a, ...d })
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

const describe = (s: State, a: Pick<Assignment, 'templateId' | 'date' | 'dept'>) => describeSlot(tr, s, a)

type ToastAction = { label: string; run: () => void }
type Toast = { id: string; msg: string; action?: ToastAction; action2?: ToastAction }

function makeActions(get: () => State, set: (s: State) => void) {
  const me = () => get().managers.find((m) => m.id === get().session.userId)
  const bid = () => get().session.branchId ?? ''
  const empName = (id: string) => get().employees.find((e) => e.id === id)?.name ?? '—'
  const entry = (e: Omit<HistoryEntry, 'id' | 'at' | 'by' | 'branchId'>, branchId = bid()): HistoryEntry => ({
    id: uid(),
    at: new Date().toISOString(),
    by: me()?.name ?? 'System',
    branchId,
    ...e,
  })
  const patch = (fn: (s: State) => Partial<State>) => {
    const s = get()
    set({ ...s, ...fn(s) })
  }
  const log = (e: Omit<HistoryEntry, 'id' | 'at' | 'by' | 'branchId'>) => patch((s) => ({ history: [entry(e), ...s.history] }))

  return {
    /** Returns an error message key, or null when signed in. */
    login(email: string): MsgKey | null {
      const m = get().managers.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      if (!m) return 'auth.notFound'
      const branches = m.role === 'super' ? get().branches : get().branches.filter((b) => m.branchIds.includes(b.id))
      patch(() => ({ session: { userId: m.id, branchId: branches.length === 1 ? branches[0].id : null } }))
      return null
    },
    logout: () => patch(() => ({ session: { userId: null, branchId: null } })),
    selectBranch: (id: string | null) => patch((s) => ({ session: { ...s.session, branchId: id } })),

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
          .map((a) => (a.branchId === b ? { ...a, tasks: a.publishedTasks } : a)),
        pendingApproval: { ...s.pendingApproval, [b]: false },
      }))
    },

    copyWeek(fromStart: string, toStart: string) {
      const s = get()
      const b = bid()
      const draft: State = { ...s, assignments: [...s.assignments] }
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
      const s = get()
      const b = bid()
      const today = todayKey()
      const pref = { morning: 'Mornings', day: 'Days', evening: 'Evenings', night: 'Nights' } as const
      const draft: State = { ...s, assignments: [...s.assignments] }
      const ids: string[] = []
      let open = 0
      const tpls = [...s.templates].sort((x, y) => toMin(x.start) - toMin(y.start))
      for (const date of weekDays(weekStart)) {
        if (date < today) continue
        for (const t of tpls)
          for (const dept of depts) {
            const have = draft.assignments.filter((a) => a.branchId === b && isActive(a) && a.date === date && a.templateId === t.id && a.dept === dept).length
            let need = needFor(t, dept, date) - have
            if (need <= 0) continue
            const pool = draft.employees
              .filter((e) => e.branchId === b && e.dept === dept && e.status === 'active')
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
          }
      }
      set(draft)
      return { ids, open }
    },
    removeMany: (ids: string[]) => patch((s) => ({ assignments: s.assignments.filter((a) => !ids.includes(a.id)) })),

    sendForApproval() {
      const b = bid()
      const branch = get().branches.find((x) => x.id === b)
      patch((s) => ({
        pendingApproval: { ...s.pendingApproval, [b]: true },
        notices: [
          { id: uid(), at: new Date().toISOString(), kind: 'approvalRequested', params: { name: me()?.name ?? '', branch: branch?.name ?? '', changes: branchChanges(s, b).length }, read: false, href: '/review' },
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
              : entry({ action: 'moved', subject: empName(c.a.employeeId), from: describe(s, c.from), to: describe(s, c.a) }),
      )
      logs.unshift(entry({ action: 'published', subject: '', count: changes.length, people: notified.length }))
      const at = new Date().toISOString()
      set({
        ...s,
        assignments: s.assignments
          .filter((a) => !(a.branchId === b && a.state === 'removed'))
          .map((a) => (a.branchId === b && a.state === 'added' ? { ...a, state: 'published' as const, movedFrom: undefined } : a))
          .map((a) => (a.branchId === b ? { ...a, publishedTasks: a.tasks } : a)),
        history: [...logs, ...s.history],
        pendingApproval: { ...s.pendingApproval, [b]: false },
        lastPublish: { branchId: b, at, count: changes.length, notified },
        notices: [
          { id: uid(), at, kind: 'published', params: { changes: changes.length, people: notified.length }, read: true, href: '/history' },
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
        set({ ...s, employees: s.employees.map((e) => (e.id === next.id ? next : e)), history: [entry({ action: 'employeeEdited', subject: next.name, to: `${deptName(tr, next.dept)} · ${next.position}` }), ...s.history] })
        return next
      }
      const e: Employee = { ...data, id: uid(), branchId: bid() }
      set({
        ...s,
        employees: [...s.employees, e],
        history: [entry({ action: 'employeeAdded', subject: e.name, to: `${deptName(tr, e.dept)} · ${e.position}${e.status === 'invited' ? ` · ${tr('history.detail.inviteSent')}` : ''}` }), ...s.history],
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

    setPreferred(id: string, preferred: Employee['preferred']) {
      patch((s) => ({ employees: s.employees.map((x) => (x.id === id ? { ...x, preferred } : x)) }))
    },

    decideLeave(id: string, status: 'approved' | 'declined') {
      const l = get().leaves.find((x) => x.id === id)
      if (!l) return
      const emp = get().employees.find((e) => e.id === l.employeeId)
      patch((s) => ({
        leaves: s.leaves.map((x) => (x.id === id ? { ...x, status } : x)),
        history: [
          entry(
            {
              action: status === 'approved' ? 'leaveApproved' : 'leaveDeclined',
              subject: emp?.name ?? '',
              to: `${tr(`leaveKind.${l.kind}`)} · ${fmtRange(l.from, l.to)} (${tr('common.days', { count: daysInclusive(l.from, l.to) })})`,
            },
            emp?.branchId,
          ),
          ...s.history,
        ],
      }))
    },

    saveTemplate(t: ShiftTemplate) {
      const s = get()
      const old = s.templates.find((x) => x.id === t.id)
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
    deleteTemplate: (id: string) => patch((s) => ({ templates: s.templates.filter((t) => t.id !== id), assignments: s.assignments.filter((a) => a.templateId !== id) })),

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
    revertTasks(assignmentId: string) {
      patch((s) => ({ assignments: s.assignments.map((x) => (x.id === assignmentId ? { ...x, tasks: x.publishedTasks } : x)) }))
    },
    removeTask(assignmentId: string, taskId: string) {
      patch((s) => ({
        assignments: s.assignments.map((x) => (x.id === assignmentId ? { ...x, tasks: x.tasks?.filter((t) => t.id !== taskId) } : x)),
      }))
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

    markRead: (id?: string) => patch((s) => ({ notices: s.notices.map((n) => (!id || n.id === id ? { ...n, read: true } : n)) })),

    setPerm(p: Perm, v: boolean) {
      patch((s) => ({ perms: { ...s.perms, [p]: v } }))
      log({ action: 'permissions', subject: tr('history.detail.managers'), to: tr(v ? 'history.detail.permOn' : 'history.detail.permOff', { perm: tr(`perm.${p}.label`) }) })
    },
    setManagerBranch(managerId: string, branchId: string, on: boolean) {
      patch((s) => ({
        managers: s.managers.map((m) =>
          m.id === managerId ? { ...m, branchIds: on ? [...new Set([...m.branchIds, branchId])] : m.branchIds.filter((x) => x !== branchId) } : m,
        ),
      }))
    },
    saveBranch(b: Omit<Branch, 'id'> & { id?: string }) {
      const s = get()
      if (b.id) {
        set({ ...s, branches: s.branches.map((x) => (x.id === b.id ? { ...x, ...b } : x)) })
        return
      }
      const nb = { ...b, id: uid() }
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

type Ctx = {
  s: State
  a: Actions
  me: Manager | null
  branch: Branch | null
  myBranches: Branch[]
  can: (p: Perm) => boolean
  toast: (msg: string, action?: ToastAction, action2?: ToastAction) => void
  pendingLeave: Leave[]
}

const StoreCtx = createContext<Ctx | null>(null)
const ToastCtx = createContext<{ toasts: Toast[]; dismiss: (id: string) => void }>({ toasts: [], dismiss: () => {} })

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(load)
  const ref = useRef(s)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* storage may be full or blocked; the app still works in memory */
    }
  }, [s])

  const a = useMemo(
    () =>
      makeActions(
        () => ref.current,
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

  const value = useMemo<Ctx>(() => {
    const me = s.managers.find((m) => m.id === s.session.userId) ?? null
    const myBranches = me ? (me.role === 'super' ? s.branches : s.branches.filter((b) => me.branchIds.includes(b.id))) : []
    const branch = s.branches.find((b) => b.id === s.session.branchId) ?? null
    const branchEmp = new Set(s.employees.filter((e) => e.branchId === branch?.id).map((e) => e.id))
    return {
      s,
      a,
      me,
      branch,
      myBranches,
      can: (p) => me?.role === 'super' || s.perms[p],
      toast,
      pendingLeave: s.leaves.filter((l) => l.status === 'pending' && branchEmp.has(l.employeeId)),
    }
  }, [s, a, toast])

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
