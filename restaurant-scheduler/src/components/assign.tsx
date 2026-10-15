import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Ban, BedDouble, CalendarDays, CalendarX2, ChevronDown, Clock, Crown, Hourglass, Megaphone, Plus, Search, Sparkles, Timer, Users, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { addDays, fmtDay, hoursBetween, startOfWeek } from '../lib/date'
import { checkAssignment, extraFor, isActive, neededAt, weekHours } from '../lib/validation'
import { cityOf, shiftWeather, useWeather } from '../lib/weather'
import { ShiftWeatherTag } from './weather'
import type { Conflict, ConflictKind } from '../lib/validation'
import type { Dept, Employee } from '../lib/types'
import { useT } from '../i18n'
import { conflictDetail, conflictTitle, deptName } from '../i18n/format'
import { Avatar, Button, cx, DeptDot, IconButton, Modal } from './ui'

const toneToPref = { morning: 'Mornings', day: 'Days', evening: 'Evenings', night: 'Nights' } as const

export const conflictIcon: Record<ConflictKind, typeof Ban> = { unavailable: CalendarX2, overlap: Ban, maxHours: Timer, elsewhere: Users, rest: BedDouble, dayMax: Hourglass }

export type Slot = { date: string; templateId: string; dept: Dept }

type Row = { e: Employee; conflicts: Conflict[]; hours: number; prefers: boolean }

/** Right-hand panel for filling a shift (opened from "Open slot"). Stays open until the shift is full. */
export function AssignPanel({ slot, anchor, onPick, onClose }: { slot: Slot; anchor?: DOMRect; onPick: (e: Employee, conflicts: Conflict[]) => void; onClose: () => void }) {
  const { s, branch } = useStore()
  const { t } = useT()
  const ref = useRef<HTMLDialogElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  // Open on the left when the shift being filled sits where the panel would cover it.
  const [left] = useState(() => !!anchor && window.innerWidth >= 640 && anchor.right > window.innerWidth - 460)
  const [q, setQ] = useState('')
  const [showOther, setShowOther] = useState(false)
  const tpl = s.templates.find((x) => x.id === slot.templateId)!
  const ws = startOfWeek(slot.date)
  const length = hoursBetween(tpl.start, tpl.end)
  const dept = s.departments.find((d) => d.id === slot.dept)
  const weather = useWeather(cityOf(branch!.city), [slot.date, addDays(slot.date, 1)])
  const sw = shiftWeather(weather.data, slot.date, tpl.start, tpl.end)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    searchRef.current?.focus()
  }, [])

  const onShift = s.assignments.filter((a) => isActive(a) && a.branchId === branch!.id && a.date === slot.date && a.templateId === slot.templateId && a.dept === slot.dept)
  const needed = neededAt(s, branch!.id, tpl, slot.dept, slot.date)
  const extra = extraFor(s, branch!.id, slot.templateId, slot.dept, slot.date)
  const events = s.announcements.filter((x) => x.branchId === branch!.id && x.date === slot.date && x.templateId === slot.templateId && x.dept === slot.dept && x.extraStaff)
  const open = Math.max(0, needed - onShift.length)
  const hasLeader = onShift.some((a) => a.isLeader)

  const { best, available, warned, blocked, other } = useMemo(() => {
    const taken = new Set(
      s.assignments
        .filter((a) => a.state !== 'removed' && a.date === slot.date && a.templateId === slot.templateId && a.dept === slot.dept && a.branchId === branch!.id)
        .map((a) => a.employeeId),
    )
    const needle = q.trim().toLowerCase()
    const rows: Row[] = s.employees
      .filter((e) => e.branchId === branch!.id && !taken.has(e.id))
      .filter((e) => !needle || e.name.toLowerCase().includes(needle) || e.position.toLowerCase().includes(needle))
      .map((e) => ({
        e,
        conflicts: checkAssignment(s, { branchId: branch!.id, employeeId: e.id, ...slot }),
        hours: weekHours(s, e.id, ws),
        prefers: e.preferred === toneToPref[tpl.tone],
      }))
    const score = (r: Row) => Number(r.prefers) * 2 + Number(r.e.dept === slot.dept) + (1 - r.hours / r.e.maxHours)
    const trained = rows.filter((r) => r.e.skills.includes(slot.dept))
    const free = trained.filter((r) => !r.conflicts.length).sort((a, b) => score(b) - score(a))
    const top = needle ? [] : free.slice(0, 3)
    return {
      best: top,
      available: free.slice(top.length),
      warned: trained.filter((r) => r.conflicts.length && !r.conflicts.some((c) => c.kind === 'overlap')).sort((a, b) => a.conflicts.length - b.conflicts.length),
      blocked: trained.filter((r) => r.conflicts.some((c) => c.kind === 'overlap')),
      other: rows.filter((r) => !r.e.skills.includes(slot.dept)).sort((a, b) => a.conflicts.length - b.conflicts.length || score(b) - score(a)),
    }
  }, [s, branch, slot, q, ws, tpl.tone])

  // Arrow keys move between people; Enter assigns (native button behaviour).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-pick]') ?? [])]
    if (!items.length) return
    e.preventDefault()
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    items[e.key === 'ArrowDown' ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1)]?.focus()
  }

  const pick = (r: Row) => onPick(r.e, r.conflicts)
  const nothing = !best.length && !available.length && !warned.length && !blocked.length

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onMouseDown={(e) => e.target === ref.current && onClose()}
      aria-label={t('assign.panelTitle', { shift: tpl.name, dept: deptName(s, slot.dept) })}
      className={cx('m-0 flex h-full max-h-none w-full max-w-[440px] flex-col bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/10', left ? 'mr-auto animate-slide-left' : 'ml-auto animate-slide')}
      onKeyDown={onKeyDown}
    >
      <header className="border-b border-line px-5 pb-4 pt-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              <DeptDot id={slot.dept} className="h-2 w-2" /> {deptName(s, slot.dept)}
            </div>
            <h2 className="mt-1 text-xl font-semibold">{t('assign.shiftTitle', { shift: tpl.name })}</h2>
          </div>
          <IconButton label={t('common.close')} onClick={onClose} className="-mr-2 -mt-1">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden /> {fmtDay(slot.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden />
            <span className="font-medium text-ink">
              {tpl.start}–{tpl.end}
            </span>
            · {t('assign.length', { hours: length })}
          </span>
          {sw && <ShiftWeatherTag w={sw} />}
        </div>

        <div className="mt-4 rounded-xl bg-paper p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('assign.filled', { got: onShift.length, need: needed })}</span>
            <span className={cx('text-[13px] font-medium', open ? 'text-bark' : 'text-forest')}>{open ? t('assign.stillOpen', { count: open }) : t('assign.full')}</span>
          </div>
          {needed > 0 && (
            <div className="mt-2 flex gap-1" aria-hidden>
              {Array.from({ length: Math.max(needed, onShift.length) }, (_, i) => (
                <span key={i} className={cx('h-1.5 flex-1 rounded-full', i < onShift.length ? 'bg-forest' : 'bg-line')} />
              ))}
            </div>
          )}
          {onShift.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {onShift.map((a) => {
                const e = s.employees.find((x) => x.id === a.employeeId)
                if (!e) return null
                return (
                  <li key={a.id} className={cx('flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-medium', a.isLeader ? 'bg-forest text-white' : 'bg-white ring-1 ring-line', a.state === 'added' && 'ring-1 ring-dashed ring-forest')}>
                    <Avatar e={e} size={20} />
                    {e.name.split(' ')[0]}
                    {a.isLeader && <Crown className="h-3 w-3 text-[#E8C15A]" aria-label={t('schedule.leader')} />}
                  </li>
                )
              })}
            </ul>
          )}
          {dept?.needsLeader && onShift.length > 0 && !hasLeader && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-warn">
              <Crown className="h-3.5 w-3.5" aria-hidden /> {t('assign.noLeaderYet')}
            </p>
          )}
          {extra > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-[#7A4F12]">
              <Megaphone className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              {t('assign.extraFor', { count: extra, title: events.map((x) => x.title).join(', ') })}
            </p>
          )}
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">{t('assign.searchTeam')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('assign.search')} className="input h-10 w-full pl-9" />
        </label>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3">
        {nothing && (
          <p className="px-3 py-8 text-center text-sm text-muted">{q ? t('assign.noMatches') : t('assign.nobodyFree', { dept: deptName(s, slot.dept) })}</p>
        )}
        {best.length > 0 && (
          <Group title={t('assign.best')} icon={<Sparkles className="h-3.5 w-3.5 text-forest" />}>
            {best.map((r) => (
              <PersonRow key={r.e.id} r={r} length={length} tplName={tpl.name} best onPick={() => pick(r)} />
            ))}
          </Group>
        )}
        {available.length > 0 && (
          <Group title={q ? t('assign.matches', { count: available.length }) : t('assign.alsoFree', { count: available.length })}>
            {available.map((r) => (
              <PersonRow key={r.e.id} r={r} length={length} tplName={tpl.name} onPick={() => pick(r)} />
            ))}
          </Group>
        )}
        {warned.length > 0 && (
          <Group title={t('assign.withWarnings', { count: warned.length })} icon={<AlertTriangle className="h-3.5 w-3.5 text-warn" />}>
            {warned.map((r) => (
              <PersonRow key={r.e.id} r={r} length={length} tplName={tpl.name} onPick={() => pick(r)} />
            ))}
          </Group>
        )}
        {blocked.length > 0 && (
          <Group title={t('assign.cant', { count: blocked.length })} icon={<Ban className="h-3.5 w-3.5 text-danger" />}>
            {blocked.map((r) => (
              <PersonRow key={r.e.id} r={r} length={length} tplName={tpl.name} onPick={() => pick(r)} />
            ))}
          </Group>
        )}
        {other.length > 0 && (
          <div className="mt-2 border-t border-line pt-2">
            <button onClick={() => setShowOther((v) => !v)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium text-muted hover:bg-paper">
              {t(showOther ? 'assign.hideOther' : 'assign.showOther', { count: other.length })}
              <ChevronDown className={cx('h-4 w-4 transition-transform', showOther && 'rotate-180')} />
            </button>
            {showOther && (
              <div className="mt-1">
                {other.map((r) => (
                  <PersonRow key={r.e.id} r={r} length={length} tplName={tpl.name} onPick={() => pick(r)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="flex items-center gap-3 border-t border-line bg-paper px-5 py-3">
        <span className="hidden flex-1 text-xs text-muted sm:block">{t('assign.keys')}</span>
        <span className="flex-1 sm:hidden" />
        <Button variant={open ? 'secondary' : 'primary'} onClick={onClose}>
          {open ? t('common.close') : t('assign.done')}
        </Button>
      </footer>
    </dialog>
  )
}

function Group({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-3">
      <h3 className="flex items-center gap-1.5 px-3 pb-1.5 pt-1 text-xs font-semibold text-muted">
        {icon}
        {title}
      </h3>
      <ul className="space-y-1">{children}</ul>
    </section>
  )
}

function PersonRow({ r, length, tplName, best, onPick }: { r: Row; length: number; tplName: string; best?: boolean; onPick: () => void }) {
  const { t } = useT()
  const after = r.hours + length
  const over = after > r.e.maxHours
  const hard = r.conflicts.some((c) => c.kind === 'overlap')
  const light = r.hours / r.e.maxHours <= 0.5
  return (
    <li>
      <button
        data-pick
        onClick={onPick}
        className={cx(
          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-paper focus-visible:bg-forest-50 focus-visible:ring-2 focus-visible:ring-forest/40',
          best && 'bg-forest-50/50',
          hard && 'opacity-60',
        )}
      >
        <Avatar e={r.e} size={36} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{r.e.name}</span>
            {r.e.status === 'invited' && <span className="shrink-0 rounded bg-paper px-1.5 text-[10px] font-medium text-muted">{t('assign.invitePending')}</span>}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="truncate">{r.e.position}</span>
            <span className="flex shrink-0 items-center gap-0.5">
              {r.e.skills.map((d) => (
                <DeptDot key={d} id={d} className="h-1.5 w-1.5" />
              ))}
            </span>
          </span>
          {!r.conflicts.length && (r.prefers || light) && (
            <span className="mt-1 flex flex-wrap gap-1">
              {r.prefers && <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-medium text-forest">{t('assign.likes', { shift: tplName })}</span>}
              {light && <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-muted">{t('assign.lightWeek')}</span>}
            </span>
          )}
          {r.conflicts.map((c, i) => {
            const Icon = conflictIcon[c.kind]
            return (
              <span key={i} title={conflictDetail(t, c)} className={cx('mt-1 flex items-start gap-1.5 text-xs', c.kind === 'overlap' ? 'text-danger' : 'text-warn')}>
                <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="line-clamp-1">{conflictDetail(t, c)}</span>
              </span>
            )
          })}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1" title={t('assign.hoursAfter', { now: r.hours, after, max: r.e.maxHours })}>
          <span className="text-xs tabular-nums text-muted">
            {r.hours}
            <span className="mx-0.5">→</span>
            <span className={cx('font-semibold', over ? 'text-danger' : 'text-ink')}>{after}</span>/{r.e.maxHours}h
          </span>
          <span className="relative h-1 w-14 overflow-hidden rounded-full bg-line">
            <span className={cx('absolute inset-y-0 left-0 rounded-full', over ? 'bg-danger/60' : 'bg-forest/35')} style={{ width: `${Math.min(1, after / r.e.maxHours) * 100}%` }} />
            <span className="absolute inset-y-0 left-0 rounded-full bg-forest" style={{ width: `${Math.min(1, r.hours / r.e.maxHours) * 100}%` }} />
          </span>
        </span>
        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors', hard ? 'text-muted' : 'bg-forest text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:opacity-100')} aria-hidden>
          <Plus className="h-4 w-4" />
        </span>
      </button>
    </li>
  )
}

export function Hours({ used, max }: { used: number; max: number }) {
  const { t } = useT()
  const pct = Math.min(1, used / max)
  return (
    <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5" title={t('assign.hoursTitle', { used, max })}>
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
  const { t } = useT()
  const hardBlock = conflicts.some((c) => c.kind === 'overlap')
  const first = employee.name.split(' ')[0]
  return (
    <Modal
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className={cx('h-5 w-5', hardBlock ? 'text-danger' : 'text-warn')} />
          {t(hardBlock ? 'assign.cantTitle' : 'assign.checkTitle', { name: first })}
        </span>
      }
      description={where}
      footer={
        <>
          <Button onClick={onClose} variant={hardBlock ? 'primary' : 'secondary'}>
            {t('assign.chooseOther')}
          </Button>
          {!hardBlock && (
            <Button variant="danger" onClick={onConfirm}>
              {t('assign.assignAnyway')}
            </Button>
          )}
        </>
      }
    >
      <ul className="space-y-2">
        {conflicts.map((c, i) => {
          const Icon = conflictIcon[c.kind]
          return (
            <li key={i} className={cx('flex gap-3 rounded-xl p-3', c.kind === 'overlap' ? 'bg-danger-50' : 'bg-warn-50')}>
              <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', c.kind === 'overlap' ? 'text-danger' : 'text-warn')} />
              <div>
                <div className="text-sm font-medium">{conflictTitle(t, c)}</div>
                <div className="text-[13px] text-ink/75">{conflictDetail(t, c)}</div>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 flex items-start gap-2 text-[13px] text-muted">
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t(hardBlock ? 'assign.hardNote' : 'assign.softNote')}
      </p>
    </Modal>
  )
}
