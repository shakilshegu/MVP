import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CalendarRange, ClipboardList, Clock3, Crown, ChevronDown, Download, Scale, StickyNote, Wand2, Loader2, MapPin, Megaphone, MoreHorizontal, ChevronLeft, ChevronRight, Copy, Eye, Plus, Undo2, UserPlus, UserRoundCheck, Users } from 'lucide-react'
import { branchChanges, useStore } from '../lib/store'
import { useT } from '../i18n'
import { conflictTitles, deptName, describeSlot } from '../i18n/format'
import { navigate, useLoad } from '../lib/hooks'
import { addDays, dayShort, fmtDay, fmtRangeYear, fmtShort, fromKey, hoursBetween, startOfWeek, todayKey, weekDays } from '../lib/date'
import { checkAssignment, extraFor, isActive, neededAt, weekHours } from '../lib/validation'
import type { Conflict } from '../lib/validation'
import type { Assignment, Dept, Employee, ShiftTemplate } from '../lib/types'
import { AssignPanel, ConflictDialog, Hours } from '../components/assign'
import { AnnouncementPill } from './Announcements'
import { DayWeatherLine, DayWeatherMini, ShiftWeatherPopover, ShiftWeatherTag } from '../components/weather'
import { TaskList } from '../components/tasks'
import { DayNote, NoteEditor } from '../components/notes'
import { HoursDrawer } from '../components/hours'
import { cityLabel, cityOf, shiftWeather, useWeather } from '../lib/weather'
import { downloadRotaPdf } from '../lib/pdf'
import type { DayWeather } from '../lib/weather'
import type { Slot } from '../components/assign'
import { Avatar, Button, cx, DeptDot, EmptyState, ErrorState, IconButton, Modal, Popover, Segmented, Skeleton, toneCls } from '../components/ui'

type Pending = { employee: Employee; conflicts: Conflict[]; slot: Slot; run: () => void }

export default function WeeklySchedule({ week }: { week: string | null }) {
  const { s, a, branch, can, toast, me, depts } = useStore()
  const { t, locale } = useT()
  const [exporting, setExporting] = useState(false)
  const today = todayKey()
  const weekStart = startOfWeek(week ?? today)
  const days = weekDays(weekStart)
  const [dept, setDept] = useState<'All' | Dept>('All')
  const [assignAt, setAssignAt] = useState<{ slot: Slot; rect: DOMRect } | null>(null)
  const [menu, setMenu] = useState<{ id: string; rect: DOMRect } | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [noteAt, setNoteAt] = useState<{ date: string; rect: DOMRect } | null>(null)
  const [showHours, setShowHours] = useState(false)
  const [weatherAt, setWeatherAt] = useState<{ date: string; rect: DOMRect } | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [mobileDay, setMobileDay] = useState(() => Math.max(0, days.indexOf(today)))
  const { status, retry } = useLoad(branch!.id + weekStart)
  const editable = can('editShifts')
  const city = cityOf(branch!.city)
  const weather = useWeather(city, days)

  const team = s.employees.filter((e) => e.branchId === branch!.id)
  const inWeek = useMemo(
    () => s.assignments.filter((x) => x.branchId === branch!.id && x.date >= weekStart && x.date <= days[6]),
    [s.assignments, branch, weekStart, days],
  )
  const visibleDepts = useMemo(() => (dept === 'All' ? depts.map((d) => d.id) : [dept]), [dept, depts])
  const changes = branchChanges(s, branch!.id)
  const affected = new Set(changes.map((c) => c.a.employeeId)).size

  const cellOf = (date: string, t: string, d: Dept) => inWeek.filter((x) => x.date === date && x.templateId === t && x.dept === d)
  // Shifts a department never staffs this week (and nobody is on) are left out of the grid.
  const rowsFor = (d: Dept) => s.templates.filter((tpl) => days.some((day) => neededAt(s, branch!.id, tpl, d, day) > 0 || cellOf(day, tpl.id, d).length > 0))
  const deptSummary = (d: Dept) => {
    let got = 0
    let need = 0
    for (const day of days)
      for (const tpl of s.templates) {
        const n = neededAt(s, branch!.id, tpl, d, day)
        need += n
        got += Math.min(n, cellOf(day, tpl.id, d).filter(isActive).length)
      }
    return { got, need }
  }
  const [folded, setFolded] = useState<Dept[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('rota-folded') ?? '[]')
    } catch {
      return []
    }
  })
  const toggleFold = (d: Dept) => {
    const next = folded.includes(d) ? folded.filter((x) => x !== d) : [...folded, d]
    setFolded(next)
    try {
      localStorage.setItem('rota-folded', JSON.stringify(next))
    } catch {
      /* private mode: folding just won't be remembered */
    }
  }

  // Keyboard: ← → change week, T jumps to this week, P opens Review & publish.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]')) return
      if (e.key === 'ArrowLeft') navigate(`/schedule?week=${addDays(weekStart, -7)}`)
      else if (e.key === 'ArrowRight') navigate(`/schedule?week=${addDays(weekStart, 7)}`)
      else if (e.key.toLowerCase() === 't') navigate('/schedule')
      else if (e.key.toLowerCase() === 'p' && changes.length) navigate('/review')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [weekStart, changes.length])
  const stats = useMemo(() => {
    let needed = 0
    let filled = 0
    let open = 0
    for (const date of days)
      for (const t of s.templates)
        for (const d of visibleDepts) {
          const n = neededAt(s, branch!.id, t, d, date)
          const f = inWeek.filter((x) => isActive(x) && x.date === date && x.templateId === t.id && x.dept === d).length
          needed += n
          filled += Math.min(n, f)
          open += Math.max(0, n - f)
        }
    const active = inWeek.filter((x) => isActive(x) && visibleDepts.includes(x.dept))
    const hours = active.reduce((sum, x) => {
      const t = s.templates.find((y) => y.id === x.templateId)
      return sum + (t ? hoursBetween(t.start, t.end) : 0)
    }, 0)
    const total = (list: Assignment[]) => ({
      people: new Set(list.map((x) => x.employeeId)).size,
      hours: list.reduce((sum, x) => {
        const t = s.templates.find((y) => y.id === x.templateId)
        return sum + (t ? hoursBetween(t.start, t.end) : 0)
      }, 0),
    })
    const perDay = days.map((d) => total(active.filter((x) => x.date === d)))
    return { coverage: needed ? Math.round((filled / needed) * 100) : 100, open, shifts: active.length, hours, people: total(active).people, perDay }
  }, [days, s.templates, visibleDepts, inWeek])

  const openMenuById = (id: string) => {
    const el = [...document.querySelectorAll<HTMLElement>(`[data-assignment="${id}"]`)].find((n) => n.offsetParent !== null)
    if (el) setMenu({ id, rect: el.getBoundingClientRect() })
  }

  const tryAssign = (employee: Employee, conflicts: Conflict[], slot: Slot) => {
    const run = (override?: Conflict[]) => {
      const id = a.assign({ branchId: branch!.id, employeeId: employee.id, ...slot }, override)
      const tpl = s.templates.find((x) => x.id === slot.templateId)!
      toast(
        t('schedule.toastAdded', { name: employee.name.split(' ')[0], shift: tpl.name, date: fmtDay(slot.date) }),
        { label: t('schedule.addTask'), run: () => openMenuById(id) },
        { label: t('common.undo'), run: () => a.remove(id) },
      )
    }
    // The fill panel stays open so several people can be added in a row.
    if (conflicts.length) setPending({ employee, conflicts, slot, run: () => run(conflicts) })
    else run()
  }

  const onDrop = (id: string, slot: Slot) => {
    setDragOver(null)
    const x = s.assignments.find((y) => y.id === id)
    if (!x || (x.date === slot.date && x.templateId === slot.templateId && x.dept === slot.dept)) return
    const employee = s.employees.find((e) => e.id === x.employeeId)!
    const conflicts = checkAssignment(s, { branchId: branch!.id, employeeId: x.employeeId, ...slot, ignoreId: x.id })
    const run = (override?: Conflict[]) => {
      a.move(id, slot, override)
      const tpl = s.templates.find((x) => x.id === slot.templateId)!
      toast(t('schedule.toastMoved', { name: employee.name.split(' ')[0], shift: tpl.name, date: fmtDay(slot.date) }))
    }
    if (conflicts.length) setPending({ employee, conflicts, slot, run: () => run(conflicts) })
    else run()
  }

  const cellProps = {
    today,
    editable,
    dragOver,
    setDragOver,
    onDrop,
    openAssign: (slot: Slot, el: HTMLElement) => setAssignAt({ slot, rect: el.getBoundingClientRect() }),
    activeKey: assignAt ? `${assignAt.slot.date}|${assignAt.slot.templateId}|${assignAt.slot.dept}` : null,
    openMenu: (x: Assignment, el: HTMLElement) => setMenu({ id: x.id, rect: el.getBoundingClientRect() }),
    employees: s.employees,
  }

  const menuItem = menu ? s.assignments.find((y) => y.id === menu.id) : undefined
  const weekIsEmpty = !inWeek.some(isActive)
  const prevWeekHasShifts = s.assignments.some((x) => x.branchId === branch!.id && isActive(x) && x.date >= addDays(weekStart, -7) && x.date < weekStart)
  const isPastWeek = days[6] < today

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">
            {weekStart === startOfWeek(today) ? t('schedule.thisWeek') : t('schedule.weekOf', { date: fmtShort(weekStart) })}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {fmtRangeYear(weekStart, days[6])}
            {status === 'ready' && team.length > 0 && (
              <>
                {' '}
                · <span className="text-ink">{t('schedule.covered', { pct: stats.coverage })}</span> ·{' '}
                <span className={stats.open ? 'text-bark' : ''}>{t('schedule.openSlots', { count: stats.open })}</span> ·{' '}
                {t('common.people', { count: stats.people })} · {t('schedule.shiftsHours', { shifts: stats.shifts, hours: stats.hours })}
              </>
            )}
            {city && (
              <>
                {' '}
                · <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{cityLabel(city.name, locale)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg bg-surface ring-1 ring-line">
            <IconButton label={`${t('schedule.prevWeek')} (←)`} onClick={() => navigate(`/schedule?week=${addDays(weekStart, -7)}`)}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <button
              onClick={() => navigate('/schedule')}
              disabled={weekStart === startOfWeek(today)}
              className="h-9 px-2 text-[13px] font-medium text-ink disabled:text-muted"
            >
              {t('common.today')}
            </button>
            <IconButton label={`${t('schedule.nextWeek')} (→)`} onClick={() => navigate(`/schedule?week=${addDays(weekStart, 7)}`)}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
          <Segmented
            label={t('common.department')}
            value={dept}
            onChange={setDept}
            options={[{ value: 'All', label: t('common.all') }, ...depts.map((d) => ({ value: d.id, label: <><DeptDot id={d.id} className="h-1.5 w-1.5" />{d.name}</> }))]}
          />
          <MoreMenu
            exporting={exporting}
            canExport={team.length > 0}
            canFill={editable && team.length > 0 && days[6] >= today && stats.open > 0}
            onFill={() => {
              const r = a.autoFill(weekStart, visibleDepts)
              if (!r.ids.length) {
                toast(t('schedule.noOneFree'))
                return
              }
              toast(
                [t('schedule.filled', { count: r.ids.length }), r.open ? t('schedule.stillOpen', { count: r.open }) : ''].filter(Boolean).join(' · '),
                { label: t('common.undo'), run: () => a.removeMany(r.ids) },
              )
            }}
            onHours={() => setShowHours(true)}
            weekStart={weekStart}
            onExport={async () => {
              setExporting(true)
              try {
                await downloadRotaPdf({ s, branch: branch!, me, weekStart, depts: visibleDepts })
                toast(t('schedule.pdfDone'))
              } catch {
                toast(t('schedule.pdfFail'))
              } finally {
                setExporting(false)
              }
            }}
          />
        </div>
      </div>

      {!editable && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-surface/70 px-4 py-3 text-sm text-muted ring-1 ring-line">
          <Eye className="h-4 w-4" /> {t('schedule.viewOnly')}
        </div>
      )}

      {status === 'loading' && <GridSkeleton />}
      {status === 'error' && (
        <div className="panel">
          <ErrorState what={t('schedule.errorWhat')} onRetry={retry} />
        </div>
      )}
      {status === 'ready' && team.length === 0 && (
        <div className="panel">
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={t('schedule.noTeamTitle', { branch: branch!.name })}
            body={t('schedule.noTeamBody')}
            action={
              <Button variant="primary" onClick={() => navigate('/team?add=1')}>
                <UserPlus className="h-4 w-4" /> {t('schedule.addEmployee')}
              </Button>
            }
          />
        </div>
      )}

      {status === 'ready' && team.length > 0 && (
        <>
          {weekIsEmpty && !isPastWeek && editable && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-forest px-5 py-4 text-white">
              <div>
                <div className="font-medium">{t('schedule.emptyWeekTitle')}</div>
                <div className="text-sm text-white/75">
                  {t(prevWeekHasShifts ? 'schedule.emptyWeekCopy' : 'schedule.emptyWeekClick')}
                </div>
              </div>
              {prevWeekHasShifts && (
                <Button
                  className="bg-surface text-forest hover:bg-forest-50"
                  onClick={() => {
                    const r = a.copyWeek(addDays(weekStart, -7), weekStart)
                    toast([t('schedule.copied', { count: r.added }), r.skipped ? t('schedule.copiedSkipped', { count: r.skipped }) : ''].filter(Boolean).join(' · '))
                  }}
                >
                  <Copy className="h-4 w-4" /> {t('schedule.copyLastWeek')}
                </Button>
              )}
            </div>
          )}

          {/* Scrolls inside its own box so the day header and totals stay in view (sticky). */}
          <div className={cx('panel hidden overflow-auto md:block', changes.length && editable ? 'max-h-[calc(100dvh-20rem)]' : 'max-h-[calc(100dvh-12rem)]')}>
            <div className="grid min-w-[1060px]" style={{ gridTemplateColumns: '150px repeat(7, minmax(126px, 1fr))' }}>
              <div className="sticky left-0 top-0 z-30 border-b border-line bg-surface" />
              {days.map((d, i) => {
                let need = 0
                let got = 0
                for (const tpl of s.templates)
                  for (const dp of visibleDepts) {
                    const n = neededAt(s, branch!.id, tpl, dp, d)
                    need += n
                    got += Math.min(n, inWeek.filter((x) => isActive(x) && x.date === d && x.templateId === tpl.id && x.dept === dp).length)
                  }
                const isToday = d === today
                return (
                  <div key={d} className={cx('group/day sticky top-0 z-20 border-b border-l border-line px-3 pb-3 pt-4', d < today ? 'bg-paper' : 'bg-surface')}>
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className={cx('text-[13px]', isToday ? 'font-semibold text-forest' : 'text-muted')}>{dayShort(i)}</span>
                        <span
                          className={cx(
                            'text-xl font-semibold leading-none',
                            isToday ? 'rounded-md bg-forest px-1.5 py-1 text-white' : d < today ? 'text-muted' : 'text-ink',
                          )}
                        >
                          {fromKey(d).getDate()}
                        </span>
                      </div>
                      <span className={cx('text-xs', got < need ? 'font-medium text-bark' : 'text-muted')} title={t('common.slotsFilled', { got, need })}>
                        {got}/{need}
                      </span>
                    </div>
                    <DayWeatherLine w={weather.data[d]} status={weather.status} onOpen={(el) => setWeatherAt({ date: d, rect: el.getBoundingClientRect() })} />
                    {s.announcements
                      .filter((x) => x.branchId === branch!.id && x.date === d)
                      .map((x) => (
                        <AnnouncementPill key={x.id} x={x} />
                      ))}
                    <DayNote note={s.dayNotes[`${branch!.id}|${d}`]} editable={editable && d >= today} onEdit={(el) => setNoteAt({ date: d, rect: el.getBoundingClientRect() })} />
                  </div>
                )
              })}
              {visibleDepts.map((dp) => (
                <DeptBand
                  key={dp}
                  dept={dp}
                  count={team.filter((e) => e.dept === dp).length}
                  collapsed={folded.includes(dp)}
                  onToggle={() => toggleFold(dp)}
                  summary={deptSummary(dp)}
                >
                  {rowsFor(dp).map((tpl) => (
                    <Row key={tpl.id} tpl={tpl}>
                      {days.map((d) => (
                        <Cell key={d} {...cellProps} slot={{ date: d, templateId: tpl.id, dept: dp }} list={cellOf(d, tpl.id, dp)} needed={neededAt(s, branch!.id, tpl, dp, d)} extra={extraFor(s, branch!.id, tpl.id, dp, d)} tone={tpl.tone} />
                      ))}
                    </Row>
                  ))}
                </DeptBand>
              ))}
              <div className="sticky bottom-0 left-0 z-30 border-t-2 border-line bg-paper px-4 py-3">
                <div className="text-sm font-semibold">{t('schedule.totals')}</div>
                <div className="text-xs text-muted">
                  {t('schedule.weekTotal')}: {t('common.people', { count: stats.people })}
                </div>
                <div className="text-xs text-muted">{t('schedule.hoursTotal', { hours: stats.hours })}</div>
              </div>
              {days.map((d, i) => (
                <div key={d} className={cx('sticky bottom-0 z-20 border-l border-t-2 border-line bg-paper px-3 py-3', d < today && 'text-muted')}>
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Users className="h-3.5 w-3.5 text-muted" aria-hidden />
                    {t('common.people', { count: stats.perDay[i].people })}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    {t('schedule.hoursTotal', { hours: stats.perDay[i].hours })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <MobileDay days={days} active={mobileDay} setActive={setMobileDay} weather={weather.data}>
            <div className="flex items-center justify-between rounded-xl bg-surface/70 px-4 py-2.5 text-sm ring-1 ring-line">
              <span className="font-medium">{t('schedule.totals')}</span>
              <span className="text-muted">
                {t('common.people', { count: stats.perDay[mobileDay].people })} · {t('schedule.hoursTotal', { hours: stats.perDay[mobileDay].hours })}
              </span>
            </div>
            {(s.dayNotes[`${branch!.id}|${days[mobileDay]}`] || (editable && days[mobileDay] >= today)) && (
              <button
                disabled={!editable || days[mobileDay] < today}
                onClick={(e) => setNoteAt({ date: days[mobileDay], rect: e.currentTarget.getBoundingClientRect() })}
                className={cx(
                  'flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm',
                  s.dayNotes[`${branch!.id}|${days[mobileDay]}`] ? 'bg-morning/60 text-morning-ink' : 'border border-dashed border-sage-dark text-muted',
                )}
              >
                <StickyNote className="h-4 w-4 shrink-0" />
                {s.dayNotes[`${branch!.id}|${days[mobileDay]}`] ?? t('schedule.addDayNote')}
              </button>
            )}
            {visibleDepts.map((dp) => (
              <section key={dp} className="panel overflow-hidden">
                <h2 className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5 text-sm font-semibold">
                  <DeptDot id={dp} />
                  {deptName(s, dp)}
                </h2>
                {s.templates
                  .filter((tpl) => neededAt(s, branch!.id, tpl, dp, days[mobileDay]) > 0 || cellOf(days[mobileDay], tpl.id, dp).length > 0)
                  .map((tpl) => (
                    <div key={tpl.id} className="flex gap-3 border-b border-line px-4 py-3 last:border-0">
                      <div className="w-20 shrink-0">
                        <div className="text-sm font-medium">{tpl.name}</div>
                        <div className="text-xs text-muted">
                          {tpl.start}–{tpl.end}
                        </div>
                        <ShiftWeatherTag w={shiftWeather(weather.data, days[mobileDay], tpl.start, tpl.end)} className="mt-1 text-xs" />
                      </div>
                      <div className="flex-1">
                        <Cell
                          {...cellProps}
                          bare
                          slot={{ date: days[mobileDay], templateId: tpl.id, dept: dp }}
                          list={cellOf(days[mobileDay], tpl.id, dp)}
                          needed={neededAt(s, branch!.id, tpl, dp, days[mobileDay])}
                          extra={extraFor(s, branch!.id, tpl.id, dp, days[mobileDay])}
                          tone={tpl.tone}
                        />
                      </div>
                    </div>
                  ))}
              </section>
            ))}
          </MobileDay>

          <Legend />
        </>
      )}

      {changes.length > 0 && (
        <div className="sticky bottom-4 z-40 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-inverse px-5 py-3 text-white shadow-2xl">
          <div className="text-sm">
            <span className="font-semibold">{t('shell.unpublished', { count: changes.length })}</span>
            <span className="text-white/65">
              {' '}
              · {t('schedule.willNotify', { count: affected })}
              {s.pendingApproval[branch!.id] && ` · ${t('schedule.waiting')}`}
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white/80 hover:bg-surface/10 hover:text-white" onClick={() => setConfirmDiscard(true)}>
              {t('schedule.discard')}
            </Button>
            <Button size="sm" className="bg-surface text-forest hover:bg-forest-50" onClick={() => navigate('/review')}>
              {t('schedule.reviewPublish')}
            </Button>
          </div>
        </div>
      )}

      {assignAt && <AssignPanel slot={assignAt.slot} anchor={assignAt.rect} onPick={(e, c) => tryAssign(e, c, assignAt.slot)} onClose={() => setAssignAt(null)} />}
      {menuItem && <ChipMenu x={menuItem} rect={menu!.rect} onClose={() => setMenu(null)} editable={editable && menuItem.date >= today} weather={weather.data} />}
      {weatherAt && <ShiftWeatherPopover date={weatherAt.date} data={weather.data} city={cityLabel(branch!.city, locale)} anchor={weatherAt.rect} onClose={() => setWeatherAt(null)} />}
      {noteAt && <NoteEditor date={noteAt.date} rect={noteAt.rect} onClose={() => setNoteAt(null)} />}
      {showHours && <HoursDrawer weekStart={weekStart} depts={visibleDepts} onClose={() => setShowHours(false)} />}
      {pending && (
        <ConflictDialog
          employee={pending.employee}
          conflicts={pending.conflicts}
          where={describeSlot(t, s, pending.slot)}
          onClose={() => setPending(null)}
          onConfirm={() => {
            pending.run()
            setPending(null)
          }}
        />
      )}
      {confirmDiscard && (
        <Modal
          title={t('schedule.discardTitle')}
          description={t('schedule.discardBody', { count: changes.length })}
          onClose={() => setConfirmDiscard(false)}
          footer={
            <>
              <Button onClick={() => setConfirmDiscard(false)}>{t('schedule.keepEditing')}</Button>
              <Button
                variant="danger"
                onClick={() => {
                  a.discardChanges()
                  setConfirmDiscard(false)
                  toast(t('schedule.discarded'))
                }}
              >
                {t('schedule.discardChanges')}
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}

function MoreMenu({
  exporting,
  canExport,
  onExport,
  canFill,
  onFill,
  onHours,
  weekStart,
}: {
  exporting: boolean
  canExport: boolean
  onExport: () => void
  canFill: boolean
  onFill: () => void
  onHours: () => void
  weekStart: string
}) {
  const { t } = useT()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const item = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-paper disabled:opacity-45 disabled:hover:bg-transparent'
  return (
    <>
      <IconButton
        label={t('schedule.moreOptions')}
        aria-haspopup="menu"
        className="h-10 w-10 bg-surface ring-1 ring-line hover:bg-paper"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setRect(new DOMRect(r.right - 240, r.top, 240, r.height))
        }}
      >
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </IconButton>
      {rect && (
        <Popover anchor={rect} onClose={() => setRect(null)} width={240}>
          <div role="menu" className="p-1.5">
            <button
              role="menuitem"
              disabled={!canFill}
              className={item}
              onClick={() => {
                setRect(null)
                onFill()
              }}
            >
              <Wand2 className="h-4 w-4 text-muted" />
              <span>
                {t('schedule.fill')}
                <span className="block text-xs text-muted">{t('schedule.fillHint')}</span>
              </span>
            </button>
            <button
              role="menuitem"
              className={item}
              onClick={() => {
                setRect(null)
                onHours()
              }}
            >
              <Scale className="h-4 w-4 text-muted" /> {t('schedule.hoursRules')}
            </button>
            <div className="my-1 h-px bg-line" />
            <button
              role="menuitem"
              disabled={!canExport || exporting}
              className={item}
              onClick={() => {
                setRect(null)
                onExport()
              }}
            >
              <Download className="h-4 w-4 text-muted" /> {t('schedule.downloadPdf')}
            </button>
            <a role="menuitem" href={`#/availability?week=${weekStart}`} onClick={() => setRect(null)} className={item}>
              <UserRoundCheck className="h-4 w-4 text-muted" /> {t('schedule.teamAvailability')}
            </a>
            <a role="menuitem" href="#/month" onClick={() => setRect(null)} className={item}>
              <CalendarRange className="h-4 w-4 text-muted" /> {t('schedule.monthView')}
            </a>
          </div>
        </Popover>
      )}
    </>
  )
}

function DeptBand({
  dept,
  count,
  collapsed,
  onToggle,
  summary,
  children,
}: {
  dept: Dept
  count: number
  collapsed: boolean
  onToggle: () => void
  summary: { got: number; need: number }
  children: ReactNode
}) {
  const { t } = useT()
  const { s } = useStore()
  const open = summary.need - summary.got
  return (
    <>
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        title={t(collapsed ? 'schedule.expandDept' : 'schedule.collapseDept')}
        className="sticky left-0 col-span-8 flex items-center gap-2 border-t border-line bg-paper px-4 py-2 text-left text-sm hover:bg-sage/40"
      >
        <ChevronDown className={cx('h-4 w-4 text-muted transition-transform', collapsed && '-rotate-90')} aria-hidden />
        <DeptDot id={dept} />
        <span className="font-semibold">{deptName(s, dept)}</span>
        <span className="text-muted">· {t('common.people', { count })}</span>
        {collapsed && (
          <span className={cx('ml-2 text-xs', open > 0 ? 'font-medium text-bark' : 'text-muted')}>
            {t('common.slotsFilled', { got: summary.got, need: summary.need })}
          </span>
        )}
      </button>
      {!collapsed && children}
    </>
  )
}

function Row({ tpl, children }: { tpl: ShiftTemplate; children: ReactNode }) {
  return (
    <>
      <div className="sticky left-0 z-10 flex gap-2.5 border-t border-line bg-surface px-4 py-3">
        <span className={cx('w-1 shrink-0 rounded-full', toneCls[tpl.tone].split(' ')[0])} />
        <div>
          <div className="text-sm font-medium">{tpl.name}</div>
          <div className="text-xs text-muted">
            {tpl.start}–{tpl.end}
          </div>
        </div>
      </div>
      {children}
    </>
  )
}

type CellProps = {
  slot: Slot
  list: Assignment[]
  needed: number
  /** Of `needed`, how many come from announcements. */
  extra?: number
  tone: ShiftTemplate['tone']
  today: string
  editable: boolean
  dragOver: string | null
  setDragOver: (k: string | null) => void
  onDrop: (id: string, slot: Slot) => void
  openAssign: (slot: Slot, el: HTMLElement) => void
  /** The cell being filled in the side panel, outlined on the grid. */
  activeKey?: string | null
  openMenu: (a: Assignment, el: HTMLElement) => void
  employees: Employee[]
  bare?: boolean
}

function Cell({ slot, list, needed, extra = 0, tone, today, editable, dragOver, setDragOver, onDrop, openAssign, activeKey, openMenu, employees, bare }: CellProps) {
  const { t } = useT()
  const { s } = useStore()
  const key = `${slot.date}|${slot.templateId}|${slot.dept}`
  const past = slot.date < today
  const canEdit = editable && !past
  const filled = list.filter(isActive).length
  const needsLeader = s.departments.find((d) => d.id === slot.dept)?.needsLeader
  const openSlots = Math.max(0, needed - filled)
  return (
    <div
      onDragOver={(e) => {
        if (!canEdit) return
        e.preventDefault()
        if (dragOver !== key) setDragOver(key)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null)
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(e.dataTransfer.getData('text/plain'), slot)
      }}
      className={cx(
        'group/cell flex flex-col gap-1 transition-colors',
        !bare && 'min-h-[68px] border-l border-t border-line p-1.5',
        !bare && past && 'bg-paper/60',
        dragOver === key && 'bg-forest-50 ring-2 ring-inset ring-forest',
        activeKey === key && 'bg-forest-50/70 ring-2 ring-inset ring-forest',
      )}
    >
      {needed > 0 && (
        <div
          className={cx('flex items-center justify-end gap-1.5 text-[10px] font-medium leading-none tabular-nums', filled < needed && !past ? 'text-bark' : 'text-muted/80')}
          title={[t('common.slotsFilled', { got: Math.min(filled, needed), need: needed }), extra ? t('schedule.extraFromAnnouncement', { count: extra }) : ''].filter(Boolean).join(' · ')}
        >
          {extra > 0 && (
            <span className="flex items-center gap-0.5 text-note">
              <Megaphone className="h-2.5 w-2.5" aria-hidden />+{extra}
            </span>
          )}
          {filled}/{needed}
        </div>
      )}
      {list.map((x) => {
        const e = employees.find((y) => y.id === x.employeeId)
        if (!e) return null
        const short = `${e.name.split(' ')[0]} ${e.name.split(' ')[1]?.[0] ?? ''}.`
        return (
          <button
            key={x.id}
            draggable={canEdit && x.state !== 'removed'}
            onDragStart={(ev) => {
              ev.dataTransfer.setData('text/plain', x.id)
              ev.dataTransfer.effectAllowed = 'move'
            }}
            data-assignment={x.id}
            onClick={(ev) => openMenu(x, ev.currentTarget)}
            style={x.state === 'removed' ? undefined : { boxShadow: `inset 3px 0 0 ${e.color}` }}
            aria-label={x.state === 'added' ? t('schedule.a11yUnpublished', { name: e.name }) : x.state === 'removed' ? t('schedule.a11yRemoved', { name: e.name }) : e.name}
            className={cx(
              'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] font-medium transition-shadow',
              canEdit && x.state !== 'removed' && 'cursor-grab active:cursor-grabbing',
              x.state === 'published' && !x.isLeader && `${toneCls[tone]} hover:shadow-sm`,
              x.state === 'published' && x.isLeader && 'bg-forest text-white hover:shadow-sm',
              x.state === 'added' && x.isLeader && 'font-semibold',
              x.state === 'added' && 'border-[1.5px] border-dashed border-forest bg-surface text-forest',
              x.state === 'removed' && 'bg-transparent text-muted line-through decoration-bark/70',
            )}
          >
            {x.isLeader && x.state !== 'removed' && <Crown className="h-3.5 w-3.5 shrink-0 text-[#E8C15A]" aria-label={t('schedule.leader')} />}
            <span className="truncate">{short}</span>
            <span className="ml-auto flex items-center gap-1">
              {!!x.tasks?.length && (
                <span className="flex items-center gap-0.5 text-[11px] font-medium opacity-80" title={x.tasks.map((task) => task.text).join(', ')}>
                  <ClipboardList className="h-3 w-3" aria-hidden />
                  <span aria-hidden>{x.tasks.length}</span>
                  <span className="sr-only">{t('schedule.a11yTasks', { count: x.tasks.length })}</span>
                </span>
              )}
              {x.overridden && <AlertTriangle className="h-3.5 w-3.5 text-warn" aria-label={t('schedule.override')} />}
              {x.state === 'added' && <span className="h-1.5 w-1.5 rounded-full bg-bark" />}
              {x.state === 'removed' && <Undo2 className="h-3.5 w-3.5 no-underline" />}
            </span>
          </button>
        )
      })}
      {canEdit &&
        Array.from({ length: openSlots }).map((_, i) => (
          <button
            key={i}
            onClick={(ev) => openAssign(slot, ev.currentTarget)}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-bark/35 py-1 text-xs font-medium text-bark/80 transition-colors hover:border-bark hover:bg-bark-50 hover:text-bark"
          >
            <Plus className="h-3 w-3" /> {t('schedule.openSlot')}
          </button>
        ))}
      {!past && needsLeader && filled > 0 && !list.some((x) => isActive(x) && x.isLeader) && (
        <div className="flex items-center justify-center gap-1 rounded-md bg-warn-50 py-0.5 text-[11px] font-medium text-warn">
          <Crown className="h-3 w-3" /> {t('schedule.noLeader')}
        </div>
      )}
      {!canEdit && openSlots > 0 && <div className="rounded-md bg-bark-50 py-1 text-center text-xs text-bark/80">{t('schedule.unfilled', { count: openSlots })}</div>}
      {canEdit && openSlots === 0 && (
        <button
          onClick={(ev) => openAssign(slot, ev.currentTarget)}
          aria-label={t('schedule.addTo', { dept: deptName(s, slot.dept) })}
          className={cx(
            'flex items-center justify-center rounded-md py-0.5 text-muted transition-opacity hover:bg-forest-50 hover:text-forest focus-visible:opacity-100',
            bare ? 'w-full border border-dashed border-line py-1 text-xs' : 'opacity-0 group-hover/cell:opacity-100',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          {bare && <span className="ml-1">{t('schedule.add')}</span>}
        </button>
      )}
      {needed === 0 && list.length === 0 && !bare && <span className="m-auto text-xs text-line group-hover/cell:hidden">—</span>}
    </div>
  )
}

function ChipMenu({ x, rect, onClose, editable, weather }: { x: Assignment; rect: DOMRect; onClose: () => void; editable: boolean; weather: Record<string, DayWeather> }) {
  const { s, a, toast } = useStore()
  const { t } = useT()
  const e = s.employees.find((y) => y.id === x.employeeId)!
  const tpl = s.templates.find((y) => y.id === x.templateId)
  const sw = tpl && shiftWeather(weather, x.date, tpl.start, tpl.end)
  const hours = weekHours(s, e.id, startOfWeek(x.date))
  return (
    <Popover anchor={rect} onClose={onClose} width={320}>
      <div className="flex items-center gap-3 border-b border-line p-4">
        <Avatar e={e} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{e.name}</div>
          <div className="text-xs text-muted">{e.position}</div>
        </div>
        <Hours used={hours} max={e.maxHours} />
      </div>
      <div className="px-4 py-3 text-[13px] text-muted">
        {describeSlot(t, s, x)}
        {x.state === 'added' && <div className="mt-1 font-medium text-forest">{t(x.movedFrom ? 'schedule.chipMoved' : 'schedule.chipNew')}</div>}
        {x.state === 'removed' && <div className="mt-1 font-medium text-bark">{t('schedule.chipRemoved')}</div>}
        {x.overridden && <div className="mt-1 text-warn">{t('schedule.despite', { list: conflictTitles(t, x.overridden) })}</div>}
        {sw && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span>{t('weather.duringShift')}</span>
            <ShiftWeatherTag w={sw} />
          </div>
        )}
      </div>
      {x.state !== 'removed' && <TaskList x={x} editable={editable} />}
      <div className="flex flex-col gap-1 border-t border-line p-2">
        <a href={`#/team/${e.id}`} onClick={onClose} className="rounded-lg px-3 py-2 text-sm hover:bg-paper">
          {t('common.viewProfile')}
        </a>
        {editable && x.state !== 'removed' && (
          <button
            onClick={() => {
              a.setLeader(x.id, !x.isLeader)
              onClose()
              if (!x.isLeader) toast(t('schedule.leaderSet', { name: e.name.split(' ')[0] }))
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-paper"
          >
            <Crown className="h-4 w-4 text-bar" /> {t(x.isLeader ? 'schedule.removeLeader' : 'schedule.makeLeader')}
          </button>
        )}
        {editable && x.state !== 'removed' && (
          <button
            onClick={() => {
              a.remove(x.id)
              onClose()
              toast(t('schedule.toastRemoved', { name: e.name.split(' ')[0] }), { label: t('common.undo'), run: () => (x.state === 'added' ? a.assign({ ...x }) : a.undoRemove(x.id)) })
            }}
            className="rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-50"
          >
            {t('schedule.removeFromShift')}
          </button>
        )}
        {editable && x.state === 'removed' && (
          <button
            onClick={() => {
              a.undoRemove(x.id)
              onClose()
            }}
            className="rounded-lg px-3 py-2 text-left text-sm font-medium text-forest hover:bg-forest-50"
          >
            {t('schedule.undoRemoval')}
          </button>
        )}
      </div>
    </Popover>
  )
}

function MobileDay({ days, active, setActive, weather, children }: { days: string[]; active: number; setActive: (i: number) => void; weather: Record<string, DayWeather>; children: ReactNode }) {
  const { t } = useT()
  const today = todayKey()
  return (
    <div className="md:hidden">
      <div role="tablist" aria-label={t('schedule.day')} className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {days.map((d, i) => (
          <button
            key={d}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cx(
              'flex w-14 shrink-0 flex-col items-center rounded-xl py-2 text-xs transition-colors',
              i === active ? 'bg-forest text-white' : 'bg-surface/60 text-muted',
              d === today && i !== active && 'ring-1 ring-forest',
            )}
          >
            {dayShort(i)}
            <span className="mt-0.5 text-base font-semibold">{fromKey(d).getDate()}</span>
            <DayWeatherMini w={weather[d]} />
          </button>
        ))}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Legend() {
  const { t } = useT()
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-day" /> {t('schedule.legendPublished')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded border-[1.5px] border-dashed border-forest bg-surface" /> {t('schedule.legendUnpublished')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="line-through decoration-bark">{t('schedule.legendName')}</span> {t('schedule.legendRemoved')}
      </span>
      <span className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-warn" /> {t('schedule.override')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="flex h-3 w-5 items-center justify-center rounded bg-forest">
          <Crown className="h-2.5 w-2.5 text-[#E8C15A]" />
        </span>{' '}
        {t('schedule.leader')}
      </span>
      <span className="hidden md:inline">{t('schedule.legendHint')}</span>
      <span className="hidden lg:inline">{t('schedule.shortcuts')}</span>
    </div>
  )
}

function GridSkeleton() {
  const { t } = useT()
  return (
    <div className="panel p-4" aria-busy="true" aria-label={t('schedule.loading')}>
      <div className="grid grid-cols-8 gap-3">
        {Array.from({ length: 8 * 6 }).map((_, i) => (
          <Skeleton key={i} className={i % 8 === 0 ? 'h-12 w-3/4' : 'h-12'} />
        ))}
      </div>
    </div>
  )
}
