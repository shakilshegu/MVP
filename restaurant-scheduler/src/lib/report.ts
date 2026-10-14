import { toKey, toMin } from './date'
import type { Assignment, Data, Tick } from './types'

export type ReportItem = { id: string; title: string; detail: string; extra: boolean; tick?: Tick }
export type ShiftPhase = 'upcoming' | 'running' | 'over'

/** What someone has to do on a shift: their checklist plus any tasks added to that shift. */
export function shiftItems(s: Data, a: Assignment): ReportItem[] {
  const e = s.employees.find((x) => x.id === a.employeeId)
  const list = s.checklists.find((c) => c.id === e?.checklistId)?.items ?? []
  const ticks = s.ticks[a.id] ?? {}
  return [
    ...list.map((i) => ({ id: i.id, title: i.title, detail: i.detail, extra: false, tick: ticks[i.id] })),
    ...(a.tasks ?? []).map((t) => ({ id: t.id, title: t.text, detail: '', extra: true, tick: ticks[t.id] ?? (t.done ? { at: '', by: '' } : undefined) })),
  ]
}

export function shiftPhase(s: Data, a: Assignment, now = new Date()): ShiftPhase {
  const t = s.templates.find((x) => x.id === a.templateId)
  const today = toKey(now)
  if (!t || a.date > today) return 'upcoming'
  if (a.date < today) return 'over'
  const mins = now.getHours() * 60 + now.getMinutes()
  const end = toMin(t.end) <= toMin(t.start) ? 24 * 60 : toMin(t.end)
  return mins < toMin(t.start) ? 'upcoming' : mins >= end ? 'over' : 'running'
}

export const doneCount = (items: ReportItem[]) => items.filter((i) => i.tick).length
