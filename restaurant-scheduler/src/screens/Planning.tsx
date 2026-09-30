import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3, Hourglass, Plus, Send, Trash2 } from 'lucide-react'
import { branchChanges, useStore } from '../lib/store'
import { navigate } from '../lib/hooks'
import { addDays, dayShort, daysInclusive, fmtLong, fmtMonthYear, fmtRange, fromKey, hoursBetween, pad, startOfWeek, todayKey, toKey, toMin, WEEK, weekdayIndex } from '../lib/date'
import { useT } from '../i18n'
import { deptName } from '../i18n/format'
import { breakMinutes, isActive, needFor } from '../lib/validation'
import { DEPTS } from '../lib/types'
import type { Dept, ShiftTemplate, Tone } from '../lib/types'
import { Avatar, Badge, Button, cx, deptDot, Drawer, EmptyState, Field, PageHeader, toneCls } from '../components/ui'

function coverage(s: ReturnType<typeof useStore>['s'], branchId: string, date: string) {
  let need = 0
  let got = 0
  for (const t of s.templates)
    for (const d of DEPTS) {
      const n = needFor(t, d, date)
      need += n
      got += Math.min(n, s.assignments.filter((x) => x.branchId === branchId && isActive(x) && x.date === date && x.templateId === t.id && x.dept === d).length)
    }
  return { need, got }
}

export function Dashboard() {
  const { s, a, me, branch, can, pendingLeave, toast } = useStore()
  const { t } = useT()
  const today = todayKey()
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'dashboard.morning' : hour < 18 ? 'dashboard.afternoon' : 'dashboard.evening'
  const changes = branchChanges(s, branch!.id)
  const next7 = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const open7 = next7.reduce((n, d) => {
    const c = coverage(s, branch!.id, d)
    return n + (c.need - c.got)
  }, 0)
  const todays = s.assignments
    .filter((x) => x.branchId === branch!.id && x.date === today && isActive(x))
    .map((x) => ({ x, e: s.employees.find((e) => e.id === x.employeeId)!, tpl: s.templates.find((y) => y.id === x.templateId)! }))
    .filter((r) => r.e && r.tpl)
    .sort((p, q) => DEPTS.indexOf(p.x.dept) - DEPTS.indexOf(q.x.dept) || toMin(p.tpl.start) - toMin(q.tpl.start))
  const nowMin = hour * 60 + new Date().getMinutes()
  const axisStart = 5 * 60
  const axisLen = 22 * 60
  const pos = (m: number) => `${(Math.max(0, Math.min(axisLen, m - axisStart)) / axisLen) * 100}%`

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t(greet, { name: me?.name.split(' ')[0] ?? '' })} sub={`${fmtLong(today)} · ${branch!.name}`} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <a href="#/schedule" className="panel p-4 transition-shadow hover:shadow-md">
          <div className="text-[13px] text-muted">{t('dashboard.workingToday')}</div>
          <div className="mt-1 text-2xl font-semibold">{new Set(todays.map((r) => r.e.id)).size}</div>
        </a>
        <a href="#/schedule" className={cx('panel p-4 transition-shadow hover:shadow-md', open7 > 0 && 'border-bark/30')}>
          <div className="text-[13px] text-muted">{t('dashboard.open7')}</div>
          <div className={cx('mt-1 text-2xl font-semibold', open7 > 0 && 'text-bark')}>{open7}</div>
        </a>
        <a href="#/leave" className="panel p-4 transition-shadow hover:shadow-md">
          <div className="text-[13px] text-muted">{t('dashboard.leaveToReview')}</div>
          <div className="mt-1 text-2xl font-semibold">{pendingLeave.length}</div>
        </a>
      </div>

      {changes.length > 0 && (
        <a href="#/review" className="mb-6 flex items-center gap-3 rounded-xl bg-forest px-5 py-4 text-white hover:bg-forest-600">
          {s.pendingApproval[branch!.id] ? <Hourglass className="h-5 w-5 shrink-0" /> : <Send className="h-5 w-5 shrink-0" />}
          <span className="flex-1 text-sm">
            <span className="font-medium">{t('shell.unpublished', { count: changes.length })}</span>
            <span className="text-white/75"> · {t(s.pendingApproval[branch!.id] ? 'dashboard.waiting' : 'dashboard.bannerHint')}</span>
          </span>
          <span className="text-sm font-medium">{t('dashboard.review')}</span>
        </a>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold">{t('dashboard.todaysShifts')}</h2>
            <a href="#/schedule" className="text-[13px] font-medium text-forest hover:underline">
              {t('common.openSchedule')}
            </a>
          </div>
          {todays.length === 0 ? (
            <EmptyState icon={<Clock3 className="h-5 w-5" />} title={t('dashboard.emptyTitle')} body={t('dashboard.emptyBody')} action={<Button onClick={() => navigate('/schedule')}>{t('common.openSchedule')}</Button>} />
          ) : (
            <div className="px-5 py-4">
              <div className="relative ml-[140px] hidden h-5 text-[11px] text-muted sm:block">
                {[6, 10, 14, 18, 22, 2].map((h) => (
                  <span key={h} className="absolute -translate-x-1/2" style={{ left: pos((h < 5 ? h + 24 : h) * 60) }}>
                    {pad(h)}:00
                  </span>
                ))}
              </div>
              <ul className="relative space-y-1.5">
                <li aria-hidden className="pointer-events-none absolute inset-y-0 left-[140px] right-0 hidden sm:block">
                  {nowMin >= axisStart && <span className="absolute inset-y-0 w-px bg-bark" style={{ left: pos(nowMin) }} />}
                </li>
                {todays.map(({ x, e, tpl }) => {
                  const st = toMin(tpl.start)
                  let en = toMin(tpl.end)
                  if (en <= st) en += 1440
                  return (
                    <li key={x.id} className="flex items-center gap-3">
                      <a href={`#/team/${e.id}`} className="flex w-[128px] shrink-0 items-center gap-2 hover:underline">
                        <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', deptDot[x.dept])} />
                        <span className="truncate text-sm">{e.name}</span>
                      </a>
                      <div className="relative hidden h-7 flex-1 sm:block">
                        <div className={cx('absolute inset-y-0 flex items-center rounded-md px-2 text-xs font-medium', toneCls[tpl.tone])} style={{ left: pos(st), width: `calc(${pos(en)} - ${pos(st)})` }}>
                          <span className="truncate">
                            {tpl.name} {tpl.start}–{tpl.end}
                          </span>
                        </div>
                      </div>
                      <span className={cx('rounded-md px-2 py-0.5 text-xs font-medium sm:hidden', toneCls[tpl.tone])}>
                        {tpl.start}–{tpl.end}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="panel">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-sm font-semibold">{t('dashboard.pending')}</h2>
              <a href="#/leave" className="text-[13px] font-medium text-forest hover:underline">
                {t('dashboard.allRequests')}
              </a>
            </div>
            {pendingLeave.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted">{t('dashboard.noRequests')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {pendingLeave.slice(0, 4).map((l) => {
                  const e = s.employees.find((x) => x.id === l.employeeId)!
                  return (
                    <li key={l.id} className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar e={e} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{e.name}</div>
                          <div className="text-[13px] text-muted">
                            {t(`leaveKind.${l.kind}`)} · {fmtRange(l.from, l.to)} ({t('dashboard.daysShort', { count: daysInclusive(l.from, l.to) })})
                          </div>
                        </div>
                      </div>
                      {can('approveLeave') && (
                        <div className="mt-2.5 flex gap-2 pl-11">
                          <Button
                            size="sm"
                            variant="quiet"
                            onClick={() => {
                              a.decideLeave(l.id, 'approved')
                              toast(t('dashboard.leaveApproved', { name: e.name.split(' ')[0] }))
                            }}
                          >
                            {t('common.approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              a.decideLeave(l.id, 'declined')
                              toast(t('dashboard.leaveDeclined', { name: e.name.split(' ')[0] }))
                            }}
                          >
                            {t('common.decline')}
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="text-sm font-semibold">{t('dashboard.next7')}</h2>
            <div className="mt-4 flex items-end gap-2">
              {next7.map((d) => {
                const c = coverage(s, branch!.id, d)
                const pct = c.need ? c.got / c.need : 1
                return (
                  <a key={d} href={`#/schedule?week=${startOfWeek(d)}`} className="group flex flex-1 flex-col items-center gap-1.5" title={t('common.slotsFilled', { got: c.got, need: c.need })}>
                    <span className="relative h-16 w-full overflow-hidden rounded-md bg-paper">
                      <span className={cx('absolute inset-x-0 bottom-0 rounded-md', pct < 1 ? 'bg-bark/70' : 'bg-forest')} style={{ height: `${pct * 100}%` }} />
                    </span>
                    <span className={cx('text-[11px]', d === today ? 'font-semibold text-forest' : 'text-muted')}>{dayShort(weekdayIndex(d))}</span>
                  </a>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export function MonthlySchedule({ month }: { month: string | null }) {
  const { s, branch } = useStore()
  const { t } = useT()
  const today = todayKey()
  const first = (month ?? today.slice(0, 7)) + '-01'
  const d0 = fromKey(first)
  const gridStart = startOfWeek(first)
  const nextMonth = toKey(new Date(d0.getFullYear(), d0.getMonth() + 1, 1))
  const prevMonth = toKey(new Date(d0.getFullYear(), d0.getMonth() - 1, 1))
  const weeks = Math.ceil((daysInclusive(gridStart, addDays(nextMonth, -1))) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i))
  const title = fmtMonthYear(first)

  let need = 0
  let got = 0
  for (const d of cells.filter((c) => c.slice(0, 7) === first.slice(0, 7))) {
    const c = coverage(s, branch!.id, d)
    need += c.need
    got += c.got
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={title}
        sub={t('month.summary', { pct: need ? Math.round((got / need) * 100) : 0, open: need - got })}
        actions={
          <div className="flex items-center rounded-lg bg-white ring-1 ring-line">
            <button aria-label={t('month.prev')} onClick={() => navigate(`/month?m=${prevMonth.slice(0, 7)}`)} className="inline-flex h-9 w-9 items-center justify-center text-muted hover:text-ink">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => navigate('/month')} className="h-9 px-2 text-[13px] font-medium">
              {t('common.today')}
            </button>
            <button aria-label={t('month.next')} onClick={() => navigate(`/month?m=${nextMonth.slice(0, 7)}`)} className="inline-flex h-9 w-9 items-center justify-center text-muted hover:text-ink">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />
      <div className="panel overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-paper text-center text-xs font-medium text-muted">
          {WEEK.map((i) => (
            <div key={i} className="py-2">
              {dayShort(i)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d) => {
            const inMonth = d.slice(0, 7) === first.slice(0, 7)
            const c = coverage(s, branch!.id, d)
            const pct = c.need ? c.got / c.need : 0
            const people = new Set(s.assignments.filter((x) => x.branchId === branch!.id && isActive(x) && x.date === d).map((x) => x.employeeId)).size
            return (
              <a
                key={d}
                href={`#/schedule?week=${startOfWeek(d)}`}
                className={cx('group min-h-[84px] border-b border-r border-line p-2 transition-colors hover:bg-forest-50 sm:min-h-[104px]', !inMonth && 'bg-paper/70 text-muted', d < today && inMonth && 'text-muted')}
              >
                <div className="flex items-center justify-between">
                  <span className={cx('text-sm', d === today && 'rounded-md bg-forest px-1.5 font-semibold text-white')}>{fromKey(d).getDate()}</span>
                  {c.got > 0 && <span className="hidden text-[11px] text-muted sm:inline">{t('month.people', { count: people })}</span>}
                </div>
                {inMonth && (
                  <div className="mt-3">
                    {c.got === 0 ? (
                      <span className="text-[11px] text-muted/80">{d >= today ? t('month.notScheduled') : ''}</span>
                    ) : (
                      <>
                        <div className="h-1.5 overflow-hidden rounded-full bg-line">
                          <div className={cx('h-full rounded-full', pct < 1 ? 'bg-bark/70' : 'bg-forest')} style={{ width: `${pct * 100}%` }} />
                        </div>
                        <div className={cx('mt-1 text-[11px]', pct < 1 ? 'text-bark' : 'text-muted')}>
                          {c.got}/{c.need}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </a>
            )
          })}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">{t('month.hint')}</p>
    </div>
  )
}

const TONES: Tone[] = ['morning', 'day', 'evening', 'night']

export function ShiftTemplates() {
  const { s, can } = useStore()
  const { t } = useT()
  const [editing, setEditing] = useState<ShiftTemplate | 'new' | null>(null)
  const sorted = [...s.templates].sort((a, b) => toMin(a.start) - toMin(b.start))
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t('templates.title')}
        sub={t('templates.sub')}
        actions={
          can('editShifts') && (
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> {t('templates.newShift')}
            </Button>
          )
        }
      />
      <div className="panel overflow-hidden">
        <div className="relative mr-5 hidden h-8 text-[11px] text-muted sm:ml-[228px] sm:block">
          {[0, 6, 12, 18, 24].map((h) => (
            <span key={h} className="absolute top-2 -translate-x-1/2" style={{ left: `${(h / 28) * 100}%` }}>
              {pad(h % 24)}:00
            </span>
          ))}
        </div>
        <ul className="divide-y divide-line">
          {sorted.map((tpl) => {
            const st = toMin(tpl.start) / 60
            let en = toMin(tpl.end) / 60
            if (en <= st) en += 24
            const totals = WEEK.map((i) => DEPTS.reduce((n, d) => n + (tpl.perDay?.[d]?.[i] ?? tpl.needed[d]), 0))
            const lo = Math.min(...totals)
            const hi = Math.max(...totals)
            const brk = breakMinutes(hoursBetween(tpl.start, tpl.end))
            return (
              <li key={tpl.id}>
                <button onClick={() => can('editShifts') && setEditing(tpl)} className="flex w-full flex-col gap-3 px-5 py-4 text-left hover:bg-paper sm:flex-row sm:items-center">
                  <div className="w-[196px] shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tpl.name}</span>
                      <span className="text-xs text-muted">{t('common.hoursShort', { count: hoursBetween(tpl.start, tpl.end) })}</span>
                    </div>
                    <div className="text-sm text-muted">
                      {tpl.start}–{tpl.end} · {t('templates.staff', { range: lo === hi ? lo : `${lo}–${hi}` })}
                    </div>
                    {(brk > 0 || tpl.perDay) && (
                      <div className="mt-0.5 text-xs text-muted">
                        {[brk ? t('templates.breakMin', { min: brk }) : '', tpl.perDay ? t('templates.varies') : ''].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <div className="relative h-8 w-full flex-1 rounded-md bg-paper">
                    <div className={cx('absolute inset-y-0 flex items-center gap-2 rounded-md px-2 text-[11px] font-medium', toneCls[tpl.tone])} style={{ left: `${(st / 28) * 100}%`, width: `${((en - st) / 28) * 100}%` }}>
                      {DEPTS.filter((d) => tpl.needed[d]).map((d) => (
                        <span key={d} className="flex items-center gap-1 whitespace-nowrap" title={deptName(t, d)}>
                          <span className={cx('h-1.5 w-1.5 rounded-full', deptDot[d])} />
                          {tpl.needed[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {editing && <ShiftDrawer t={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ShiftDrawer({ t, onClose }: { t: ShiftTemplate | null; onClose: () => void }) {
  const { s, a, toast } = useStore()
  const { t: tt } = useT()
  const [f, setF] = useState<ShiftTemplate>(() => t ?? { id: Math.random().toString(36).slice(2, 9), name: '', start: '12:00', end: '20:00', tone: 'day', needed: { Bar: 0, Service: 1, Kitchen: 1 } })
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const upcoming = t ? s.assignments.filter((x) => x.templateId === t.id && isActive(x) && x.date >= todayKey()).length : 0

  const save = () => {
    if (!f.name.trim()) return setError(tt('templates.errName'))
    if (f.start === f.end) return setError(tt('templates.errSame'))
    if (s.templates.some((x) => x.id !== f.id && x.name.toLowerCase() === f.name.trim().toLowerCase())) return setError(tt('templates.errDup'))
    a.saveTemplate({ ...f, name: f.name.trim() })
    toast(tt(t ? 'templates.updated' : 'templates.created', { name: f.name.trim() }))
    onClose()
  }
  const setNeed = (d: Dept, n: number) => setF((p) => ({ ...p, needed: { ...p.needed, [d]: Math.max(0, Math.min(9, n)) } }))

  return (
    <Drawer
      title={t ? tt('templates.editTitle', { name: t.name }) : tt('templates.newShift')}
      onClose={onClose}
      footer={
        <>
          {t && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label={tt('templates.deleteA11y')}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1" />
          <Button onClick={onClose}>{tt('common.cancel')}</Button>
          <Button variant="primary" onClick={save}>
            {t ? tt('common.save') : tt('templates.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label={tt('templates.name')} htmlFor="t-name" error={error}>
          <input id="t-name" autoFocus className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={tt('templates.namePlaceholder')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tt('templates.starts')} htmlFor="t-start">
            <input id="t-start" type="time" className="input" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
          </Field>
          <Field label={tt('templates.ends')} htmlFor="t-end" hint={toMin(f.end) <= toMin(f.start) ? tt('templates.afterMidnight') : undefined}>
            <input id="t-end" type="time" className="input" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
          </Field>
        </div>
        <p className="-mt-2 text-[13px] text-muted">{tt('templates.hours', { count: hoursBetween(f.start, f.end) })}</p>
        <Field label={tt('templates.colour')}>
          <div className="flex gap-2">
            {TONES.map((tone) => (
              <button
                key={tone}
                onClick={() => setF({ ...f, tone })}
                aria-pressed={f.tone === tone}
                className={cx('h-9 flex-1 rounded-lg text-xs font-medium ring-offset-2', toneCls[tone], f.tone === tone && 'ring-2 ring-forest')}
              >
                {tt(`tone.${tone}`)}
              </button>
            ))}
          </div>
        </Field>
        <div>
          <div className="mb-1.5 text-sm font-medium">{tt('templates.staffNeeded')}</div>
          <p className="mb-3 text-[13px] text-muted">{tt('templates.staffHint')}</p>
          {f.perDay ? (
            <PerDayGrid f={f} setF={setF} />
          ) : (
          <div className="space-y-2">
            {DEPTS.map((d) => (
              <div key={d} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <span className={cx('h-2 w-2 rounded-full', deptDot[d])} />
                  {deptName(tt, d)}
                </span>
                <div className="flex items-center gap-1">
                  <button aria-label={tt('templates.fewer', { dept: deptName(tt, d) })} onClick={() => setNeed(d, f.needed[d] - 1)} className="h-8 w-8 rounded-lg bg-white text-lg leading-none ring-1 ring-line hover:ring-forest/40">
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
                    {f.needed[d]}
                  </span>
                  <button aria-label={tt('templates.more', { dept: deptName(tt, d) })} onClick={() => setNeed(d, f.needed[d] + 1)} className="h-8 w-8 rounded-lg bg-white text-lg leading-none ring-1 ring-line hover:ring-forest/40">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-forest"
              checked={!!f.perDay}
              onChange={(e) =>
                setF((p) => ({
                  ...p,
                  perDay: e.target.checked ? (Object.fromEntries(DEPTS.map((d) => [d, Array(7).fill(p.needed[d])])) as Record<Dept, number[]>) : undefined,
                }))
              }
            />
            {tt('templates.perDay')}
          </label>
        </div>
        {breakMinutes(hoursBetween(f.start, f.end)) > 0 && (
          <p className="rounded-xl bg-paper px-3 py-2.5 text-[13px] text-muted">
            {tt('templates.breakNote', { over: hoursBetween(f.start, f.end) > 9 ? 9 : 6, min: breakMinutes(hoursBetween(f.start, f.end)) })}
          </p>
        )}
        {t && upcoming > 0 && <Badge tone="neutral">{tt('templates.usedBy', { count: upcoming })}</Badge>}
        {confirmDelete && (
          <div className="rounded-xl border border-danger/30 bg-danger-50 p-4">
            <div className="text-sm font-medium text-danger">{tt('templates.deleteTitle', { name: t?.name ?? '' })}</div>
            <p className="mt-1 text-[13px] text-ink/75">
              {upcoming ? tt('templates.deleteAlso', { count: upcoming }) : tt('templates.deleteNone')} {tt('templates.cantUndo')}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => setConfirmDelete(false)}>
                {tt('templates.keep')}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  a.deleteTemplate(t!.id)
                  toast(tt('templates.deleted', { name: t!.name }))
                  onClose()
                }}
              >
                {tt('templates.deleteBtn')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}


function PerDayGrid({ f, setF }: { f: ShiftTemplate; setF: (fn: (p: ShiftTemplate) => ShiftTemplate) => void }) {
  const { t } = useT()
  const set = (d: Dept, i: number, n: number) =>
    setF((p) => ({ ...p, perDay: { ...p.perDay!, [d]: p.perDay![d].map((v, j) => (j === i ? Math.max(0, Math.min(9, n)) : v)) } }))
  return (
    <div className="overflow-x-auto rounded-xl bg-paper p-2">
      <table className="w-full text-center text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="w-20" />
            {WEEK.map((i) => (
              <th key={i} className="px-0.5 pb-1 font-medium">
                {dayShort(i).slice(0, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DEPTS.map((d) => (
            <tr key={d}>
              <td className="py-1 pr-1 text-left">
                <span className="flex items-center gap-1.5 text-[13px]">
                  <span className={cx('h-2 w-2 rounded-full', deptDot[d])} />
                  {deptName(t, d)}
                </span>
              </td>
              {f.perDay![d].map((v, i) => (
                <td key={i} className="px-0.5 py-1">
                  <input
                    type="number"
                    min={0}
                    max={9}
                    value={v}
                    aria-label={t('templates.perDayA11y', { dept: deptName(t, d), day: dayShort(i) })}
                    onChange={(e) => set(d, i, Number(e.target.value))}
                    className="h-8 w-full min-w-[30px] rounded-md border border-line bg-white text-center text-sm focus:border-forest focus:outline-none"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
