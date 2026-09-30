import { dayLong, fmtDay, fmtDuration, fmtRange } from '../lib/date'
import { MIN_REST_HOURS } from '../lib/validation'
import type { Conflict, WeekIssue } from '../lib/validation'
import type { Assignment, ConflictKind, Dept, HistoryEntry, Notice, State } from '../lib/types'
import type { MsgKey, Params } from './core'

/** A bound translator, e.g. `useT().t` or `tr`. */
export type T = (key: MsgKey, params?: Params) => string

export const deptName = (t: T, d: Dept) => t(`dept.${d}`)

export function describeSlot(t: T, s: State, a: Pick<Assignment, 'templateId' | 'date' | 'dept'>) {
  const tpl = s.templates.find((x) => x.id === a.templateId)
  return t('schedule.describe', { shift: tpl?.name ?? '', start: tpl?.start ?? '', end: tpl?.end ?? '', date: fmtDay(a.date), dept: deptName(t, a.dept) })
}

export function conflictTitle(t: T, c: Conflict) {
  if (c.kind === 'unavailable' && c.params.reason === 'leave') return t('conflict.onLeave.title')
  return t(`conflict.${c.kind}.title`)
}

export function conflictDetail(t: T, c: Conflict) {
  const p = c.params
  const where = p.branch ? t('conflict.at', { branch: p.branch }) : ''
  const shift = { shift: p.shift ?? '', start: p.start ?? '', end: p.end ?? '', date: p.date ? fmtDay(p.date) : '' }
  switch (c.kind) {
    case 'unavailable':
      return p.reason === 'leave'
        ? t('conflict.onLeave.detail', { name: p.name, kind: t(`leaveKind.${p.leaveKind ?? 'Vacation'}`), range: fmtRange(p.from!, p.to!) })
        : t('conflict.unavailable.detail', { name: p.name, weekday: dayLong(p.weekday ?? 0) })
    case 'overlap':
      return t('conflict.overlap.detail', { ...shift, where })
    case 'rest':
      return t('conflict.rest.detail', { ...shift, rest: fmtDuration(p.restMinutes ?? 0), min: MIN_REST_HOURS })
    case 'elsewhere':
      return t('conflict.elsewhere.detail', { shift: p.shift ?? '', dept: p.dept ? deptName(t, p.dept) : '', where })
    case 'dayMax':
      return t('conflict.dayMax.detail', { name: p.name, total: p.total ?? 0, max: p.max ?? 0, date: p.date ? fmtDay(p.date) : '' })
    case 'maxHours':
      return t('conflict.maxHours.detail', { name: p.name, total: p.total ?? 0, max: p.max ?? 0 })
  }
}

export const conflictTitles = (t: T, kinds: ConflictKind[]) => kinds.map((k) => t(`conflict.${k}.title`)).join(', ')

export function weekIssueText(t: T, i: WeekIssue) {
  switch (i.kind) {
    case 'rest':
      return t('hours.rest', { rest: fmtDuration(i.restMinutes), shift: i.shift, date: fmtDay(i.date) })
    case 'dayMax':
      return t('hours.dayMax', { hours: i.hours, date: fmtDay(i.date) })
    case 'maxHours':
      return t('hours.maxHours', { total: i.total, max: i.max })
  }
}

export function noticeText(t: T, n: Notice): { title: string; body: string } {
  const p = n.params
  switch (n.kind) {
    case 'leaveRequested':
      return {
        title: t('notice.leaveRequested.title', { name: p.name }),
        body: t('notice.leaveRequested.body', { branch: p.branch, kind: t(`leaveKind.${p.kind as 'Vacation'}`), range: fmtRange(String(p.from), String(p.to)) }),
      }
    case 'inviteNotAccepted':
      return { title: t('notice.inviteNotAccepted.title', { name: p.name }), body: t('notice.inviteNotAccepted.body') }
    case 'availabilityUpdated':
      return { title: t('notice.availabilityUpdated.title', { name: p.name }), body: t('notice.availabilityUpdated.body', { weekday: dayLong(Number(p.weekday)) }) }
    case 'published':
      return {
        title: t('notice.published.title'),
        body: t('notice.published.body', { changes: t('history.changes', { count: p.changes }), people: t('publish.notified', { count: p.people }) }),
      }
    case 'approvalRequested':
      return {
        title: t('notice.approvalRequested.title', { name: p.name }),
        body: t('notice.approvalRequested.body', { branch: p.branch, changes: t('history.changes', { count: p.changes }) }),
      }
  }
}

/** History rows keep the words recorded at the time; counts on "published" rows render live. */
export function historyText(t: T, h: HistoryEntry) {
  if (h.action === 'published' && h.count != null) {
    return { subject: t('history.changes', { count: h.count }), from: h.from, to: h.people != null ? t('publish.notified', { count: h.people }) : h.to }
  }
  return { subject: h.subject, from: h.from, to: h.to }
}
