import { useMemo, useState } from 'react'
import { AlertTriangle, Ban, BedDouble, CalendarX2, ChevronDown, Clock, Hourglass, Search, Timer, Users } from 'lucide-react'
import { useStore } from '../lib/store'
import { fmtDay, startOfWeek } from '../lib/date'
import { checkAssignment, weekHours } from '../lib/validation'
import type { Conflict, ConflictKind } from '../lib/validation'
import type { Dept, Employee } from '../lib/types'
import { Avatar, Button, cx, deptDot, Modal } from './ui'

const toneToPref = { morning: 'Mornings', day: 'Days', evening: 'Evenings', night: 'Nights' } as const

export const conflictIcon: Record<ConflictKind, typeof Ban> = { unavailable: CalendarX2, overlap: Ban, maxHours: Timer, elsewhere: Users, rest: BedDouble, dayMax: Hourglass }

export type Slot = { date: string; templateId: string; dept: Dept }

type Row = { e: Employee; conflicts: Conflict[]; hours: number; prefers: boolean }

export function AssignPanel({ slot, onPick }: { slot: Slot; onPick: (e: Employee, conflicts: Conflict[]) => void }) {
  const { s, branch } = useStore()
  const [q, setQ] = useState('')
  const [showOther, setShowOther] = useState(false)
  const tpl = s.templates.find((t) => t.id === slot.templateId)!
  const ws = startOfWeek(slot.date)

  const { available, blocked, other } = useMemo(() => {
    const inCell = new Set(
      s.assignments
        .filter((a) => a.state !== 'removed' && a.date === slot.date && a.templateId === slot.templateId && a.dept === slot.dept && a.branchId === branch!.id)
        .map((a) => a.employeeId),
    )
    const rows: Row[] = s.employees
      .filter((e) => e.branchId === branch!.id && !inCell.has(e.id))
      .filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.position.toLowerCase().includes(q.toLowerCase()))
      .map((e) => ({
        e,
        conflicts: checkAssignment(s, { branchId: branch!.id, employeeId: e.id, ...slot }),
        hours: weekHours(s, e.id, ws),
        prefers: e.preferred === toneToPref[tpl.tone],
      }))
    const sort = (a: Row, b: Row) => Number(b.prefers) - Number(a.prefers) || a.hours / a.e.maxHours - b.hours / b.e.maxHours
    const same = rows.filter((r) => r.e.dept === slot.dept)
    return {
      available: same.filter((r) => !r.conflicts.length).sort(sort),
      blocked: same.filter((r) => r.conflicts.length).sort((a, b) => a.conflicts.length - b.conflicts.length),
      other: rows.filter((r) => r.e.dept !== slot.dept).sort((a, b) => a.conflicts.length - b.conflicts.length || sort(a, b)),
    }
  }, [s, branch, slot, q, ws, tpl.tone])

  return (
    <div className="flex max-h-[inherit] flex-col">
      <div className="border-b border-line px-4 pb-3 pt-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className={cx('h-2 w-2 rounded-full', deptDot[slot.dept])} />
          {slot.dept} · {tpl.name}
        </div>
        <div className="mt-0.5 text-[13px] text-muted">
          {fmtDay(slot.date)}, {tpl.start}–{tpl.end}
        </div>
        <label className="relative mt-3 block">
          <span className="sr-only">Search team</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or role" className="input h-9 pl-9" />
        </label>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <Group title={`Available (${available.length})`} rows={available} onPick={onPick} empty={q ? 'No matches.' : `Nobody in ${slot.dept} is free for this shift.`} />
        {blocked.length > 0 && <Group title={`Has conflicts (${blocked.length})`} rows={blocked} onPick={onPick} />}
        {other.length > 0 && (
          <div className="mt-1 border-t border-line pt-1">
            <button onClick={() => setShowOther((v) => !v)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-[13px] font-medium text-muted hover:bg-paper">
              {showOther ? 'Hide' : 'Show'} {other.length} from other departments
              <ChevronDown className={cx('h-4 w-4 transition-transform', showOther && 'rotate-180')} />
            </button>
            {showOther && <Group rows={other} onPick={onPick} />}
          </div>
        )}
      </div>
    </div>
  )
}

function Group({ title, rows, onPick, empty }: { title?: string; rows: Row[]; onPick: (e: Employee, c: Conflict[]) => void; empty?: string }) {
  return (
    <div className="mb-1">
      {title && <div className="px-2 pb-1 pt-2 text-xs font-medium text-muted">{title}</div>}
      {rows.length === 0 && empty && <p className="px-2 py-3 text-[13px] text-muted">{empty}</p>}
      <ul>
        {rows.map((r) => (
          <li key={r.e.id}>
            <button onClick={() => onPick(r.e, r.conflicts)} className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-paper focus-visible:bg-paper">
              <Avatar e={r.e} size={32} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{r.e.name}</span>
                  {r.e.status === 'invited' && <span className="text-[11px] text-muted">invite pending</span>}
                </span>
                <span className="block text-xs text-muted">
                  {r.e.position}
                  {r.prefers && <span className="text-forest"> · prefers this shift</span>}
                </span>
                {r.conflicts.map((c) => {
                  const Icon = conflictIcon[c.kind]
                  return (
                    <span key={c.kind + c.detail} className={cx('mt-1 flex items-start gap-1.5 text-xs', c.kind === 'overlap' ? 'text-danger' : 'text-warn')}>
                      <Icon className="mt-px h-3.5 w-3.5 shrink-0" />
                      {c.detail}
                    </span>
                  )
                })}
              </span>
              <Hours used={r.hours} max={r.e.maxHours} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Hours({ used, max }: { used: number; max: number }) {
  const pct = Math.min(1, used / max)
  return (
    <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5" title={`${used} of ${max} hours this week`}>
      <span className="text-xs text-muted">
        <span className="font-medium text-ink">{used}</span>/{max}h
      </span>
      <span className="h-1 w-12 overflow-hidden rounded-full bg-line">
        <span className={cx('block h-full rounded-full', pct >= 0.95 ? 'bg-bark' : 'bg-forest')} style={{ width: `${pct * 100}%` }} />
      </span>
    </span>
  )
}

export function ConflictDialog({
  employee,
  conflicts,
  where,
  onConfirm,
  onClose,
}: {
  employee: Employee
  conflicts: Conflict[]
  where: string
  onConfirm: () => void
  onClose: () => void
}) {
  const hardBlock = conflicts.some((c) => c.kind === 'overlap')
  const first = employee.name.split(' ')[0]
  return (
    <Modal
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className={cx('h-5 w-5', hardBlock ? 'text-danger' : 'text-warn')} />
          {hardBlock ? `${first} can’t take this shift` : `Check before assigning ${first}`}
        </span>
      }
      description={where}
      footer={
        <>
          <Button onClick={onClose} variant={hardBlock ? 'primary' : 'secondary'}>
            Choose someone else
          </Button>
          {!hardBlock && (
            <Button variant="danger" onClick={onConfirm}>
              Assign anyway
            </Button>
          )}
        </>
      }
    >
      <ul className="space-y-2">
        {conflicts.map((c) => {
          const Icon = conflictIcon[c.kind]
          return (
            <li key={c.kind + c.detail} className={cx('flex gap-3 rounded-xl p-3', c.kind === 'overlap' ? 'bg-danger-50' : 'bg-warn-50')}>
              <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', c.kind === 'overlap' ? 'text-danger' : 'text-warn')} />
              <div>
                <div className="text-sm font-medium">{c.title}</div>
                <div className="text-[13px] text-ink/75">{c.detail}</div>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 flex items-start gap-2 text-[13px] text-muted">
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {hardBlock
          ? 'Overlapping shifts can’t be overridden. Remove the other shift first, or pick someone else.'
          : 'If you assign anyway, the shift is flagged on the schedule and the override is recorded in History.'}
      </p>
    </Modal>
  )
}
