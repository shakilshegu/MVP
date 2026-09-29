import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CalendarRange, ChevronLeft, ChevronRight, Copy, Eye, Plus, Undo2, UserPlus, Users } from 'lucide-react'
import { branchChanges, describe, useStore } from '../lib/store'
import { navigate, useLoad } from '../lib/hooks'
import { addDays, DAY_SHORT, fmtDay, fmtRange, fmtShort, fromKey, hoursBetween, startOfWeek, todayKey, weekDays } from '../lib/date'
import { checkAssignment, isActive, weekHours } from '../lib/validation'
import type { Conflict } from '../lib/validation'
import type { Assignment, Dept, Employee, ShiftTemplate } from '../lib/types'
import { DEPTS } from '../lib/types'
import { AssignPanel, ConflictDialog, Hours } from '../components/assign'
import type { Slot } from '../components/assign'
import { Avatar, Button, cx, deptDot, EmptyState, ErrorState, IconButton, Modal, Popover, Segmented, Skeleton, toneCls } from '../components/ui'

type Pending = { employee: Employee; conflicts: Conflict[]; slot: Slot; run: () => void }

export default function WeeklySchedule({ week }: { week: string | null }) {
  const { s, a, branch, can, toast } = useStore()
  const today = todayKey()
  const weekStart = startOfWeek(week ?? today)
  const days = weekDays(weekStart)
  const [dept, setDept] = useState<'All' | Dept>('All')
  const [assignAt, setAssignAt] = useState<{ slot: Slot; rect: DOMRect } | null>(null)
  const [menu, setMenu] = useState<{ a: Assignment; rect: DOMRect } | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [mobileDay, setMobileDay] = useState(() => Math.max(0, days.indexOf(today)))
  const { status, retry } = useLoad(branch!.id + weekStart)
  const editable = can('editShifts')

  const team = s.employees.filter((e) => e.branchId === branch!.id)
  const inWeek = useMemo(
    () => s.assignments.filter((x) => x.branchId === branch!.id && x.date >= weekStart && x.date <= days[6]),
    [s.assignments, branch, weekStart, days],
  )
  const visibleDepts = useMemo(() => (dept === 'All' ? DEPTS : [dept]), [dept])
  const changes = branchChanges(s, branch!.id)
  const affected = new Set(changes.map((c) => c.a.employeeId)).size

  const cellOf = (date: string, t: string, d: Dept) => inWeek.filter((x) => x.date === date && x.templateId === t && x.dept === d)
  const stats = useMemo(() => {
    let needed = 0
    let filled = 0
    let open = 0
    for (const date of days)
      for (const t of s.templates)
        for (const d of visibleDepts) {
          const n = t.needed[d]
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
    return { coverage: needed ? Math.round((filled / needed) * 100) : 100, open, shifts: active.length, hours }
  }, [days, s.templates, visibleDepts, inWeek])

  const tryAssign = (employee: Employee, conflicts: Conflict[], slot: Slot) => {
    const run = (override?: Conflict[]) => {
      const id = a.assign({ branchId: branch!.id, employeeId: employee.id, ...slot }, override)
      const tpl = s.templates.find((t) => t.id === slot.templateId)!
      toast(`${employee.name.split(' ')[0]} added to ${tpl.name}, ${fmtDay(slot.date)}`, { label: 'Undo', run: () => a.remove(id) })
    }
    setAssignAt(null)
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
      toast(`Moved ${employee.name.split(' ')[0]} to ${describe(s, slot).split(' · ')[0]}`)
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
    openMenu: (x: Assignment, el: HTMLElement) => setMenu({ a: x, rect: el.getBoundingClientRect() }),
    employees: s.employees,
  }

  const weekIsEmpty = !inWeek.some(isActive)
  const prevWeekHasShifts = s.assignments.some((x) => x.branchId === branch!.id && isActive(x) && x.date >= addDays(weekStart, -7) && x.date < weekStart)
  const isPastWeek = days[6] < today

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">
            {weekStart === startOfWeek(today) ? 'This week' : `Week of ${fmtShort(weekStart)}`}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {fmtRange(weekStart, days[6])} {fromKey(days[6]).getFullYear()}
            {status === 'ready' && team.length > 0 && (
              <>
                {' '}
                · <span className="text-ink">{stats.coverage}% covered</span> ·{' '}
                <span className={stats.open ? 'text-bark' : ''}>
                  {stats.open} open {stats.open === 1 ? 'slot' : 'slots'}
                </span>{' '}
                · {stats.shifts} shifts, {stats.hours}h
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg bg-white ring-1 ring-line">
            <IconButton label="Previous week" onClick={() => navigate(`/schedule?week=${addDays(weekStart, -7)}`)}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <button
              onClick={() => navigate('/schedule')}
              disabled={weekStart === startOfWeek(today)}
              className="h-9 px-2 text-[13px] font-medium text-ink disabled:text-muted"
            >
              Today
            </button>
            <IconButton label="Next week" onClick={() => navigate(`/schedule?week=${addDays(weekStart, 7)}`)}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
          <Segmented
            label="Department"
            value={dept}
            onChange={setDept}
            options={[{ value: 'All', label: 'All' }, ...DEPTS.map((d) => ({ value: d, label: <><span className={cx('h-1.5 w-1.5 rounded-full', deptDot[d])} />{d}</> }))]}
          />
          <a href="#/month" className="hidden h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-forest hover:bg-white/50 sm:inline-flex">
            <CalendarRange className="h-4 w-4" /> Month
          </a>
        </div>
      </div>

      {!editable && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3 text-sm text-muted ring-1 ring-line">
          <Eye className="h-4 w-4" /> View only. Your account can’t edit shifts — ask a super admin if you need to.
        </div>
      )}

      {status === 'loading' && <GridSkeleton />}
      {status === 'error' && (
        <div className="panel">
          <ErrorState what="the schedule" onRetry={retry} />
        </div>
      )}
      {status === 'ready' && team.length === 0 && (
        <div className="panel">
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={`${branch!.name} has no team yet`}
            body="Add the people who work here first. Then you can start filling shifts."
            action={
              <Button variant="primary" onClick={() => navigate('/team?add=1')}>
                <UserPlus className="h-4 w-4" /> Add employee
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
                <div className="font-medium">Nothing scheduled this week yet</div>
                <div className="text-sm text-white/75">
                  {prevWeekHasShifts ? 'Start from last week’s schedule and adjust, or click any open slot.' : 'Click any open slot to assign someone.'}
                </div>
              </div>
              {prevWeekHasShifts && (
                <Button
                  className="bg-white text-forest hover:bg-forest-50"
                  onClick={() => {
                    const r = a.copyWeek(addDays(weekStart, -7), weekStart)
                    toast(`Copied ${r.added} shifts as drafts${r.skipped ? ` · ${r.skipped} skipped because of conflicts` : ''}`)
                  }}
                >
                  <Copy className="h-4 w-4" /> Copy last week
                </Button>
              )}
            </div>
          )}

          <div className="panel hidden overflow-x-auto md:block">
            <div className="grid min-w-[1060px]" style={{ gridTemplateColumns: '150px repeat(7, minmax(126px, 1fr))' }}>
              <div className="sticky left-0 z-10 bg-white" />
              {days.map((d, i) => {
                let need = 0
                let got = 0
                for (const t of s.templates)
                  for (const dp of visibleDepts) {
                    need += t.needed[dp]
                    got += Math.min(t.needed[dp], inWeek.filter((x) => isActive(x) && x.date === d && x.templateId === t.id && x.dept === dp).length)
                  }
                const isToday = d === today
                return (
                  <div key={d} className={cx('border-l border-line px-3 pb-3 pt-4', d < today && 'bg-paper/60')}>
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className={cx('text-[13px]', isToday ? 'font-semibold text-forest' : 'text-muted')}>{DAY_SHORT[i]}</span>
                        <span
                          className={cx(
                            'text-xl font-semibold leading-none',
                            isToday ? 'rounded-md bg-forest px-1.5 py-1 text-white' : d < today ? 'text-muted' : 'text-ink',
                          )}
                        >
                          {fromKey(d).getDate()}
                        </span>
                      </div>
                      <span className={cx('text-xs', got < need ? 'font-medium text-bark' : 'text-muted')} title={`${got} of ${need} slots filled`}>
                        {got}/{need}
                      </span>
                    </div>
                  </div>
                )
              })}
              {visibleDepts.map((dp) => (
                <DeptBand key={dp} dept={dp} count={team.filter((e) => e.dept === dp).length}>
                  {s.templates.map((t) => (
                    <Row key={t.id} tpl={t}>
                      {days.map((d) => (
                        <Cell key={d} {...cellProps} slot={{ date: d, templateId: t.id, dept: dp }} list={cellOf(d, t.id, dp)} needed={t.needed[dp]} tone={t.tone} />
                      ))}
                    </Row>
                  ))}
                </DeptBand>
              ))}
            </div>
          </div>

          <MobileDay days={days} active={mobileDay} setActive={setMobileDay}>
            {visibleDepts.map((dp) => (
              <section key={dp} className="panel overflow-hidden">
                <h2 className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2.5 text-sm font-semibold">
                  <span className={cx('h-2 w-2 rounded-full', deptDot[dp])} />
                  {dp}
                </h2>
                {s.templates
                  .filter((t) => t.needed[dp] > 0 || cellOf(days[mobileDay], t.id, dp).length > 0)
                  .map((t) => (
                    <div key={t.id} className="flex gap-3 border-b border-line px-4 py-3 last:border-0">
                      <div className="w-20 shrink-0">
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-xs text-muted">
                          {t.start}–{t.end}
                        </div>
                      </div>
                      <div className="flex-1">
                        <Cell
                          {...cellProps}
                          bare
                          slot={{ date: days[mobileDay], templateId: t.id, dept: dp }}
                          list={cellOf(days[mobileDay], t.id, dp)}
                          needed={t.needed[dp]}
                          tone={t.tone}
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
        <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-3 text-white shadow-2xl">
          <div className="text-sm">
            <span className="font-semibold">
              {changes.length} unpublished {changes.length === 1 ? 'change' : 'changes'}
            </span>
            <span className="text-white/65">
              {' '}
              · {affected} {affected === 1 ? 'person' : 'people'} will be notified
              {s.pendingApproval[branch!.id] && ' · waiting for approval'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setConfirmDiscard(true)}>
              Discard
            </Button>
            <Button size="sm" className="bg-white text-forest hover:bg-forest-50" onClick={() => navigate('/review')}>
              Review & publish
            </Button>
          </div>
        </div>
      )}

      {assignAt && (
        <Popover anchor={assignAt.rect} onClose={() => setAssignAt(null)} width={360}>
          <AssignPanel slot={assignAt.slot} onPick={(e, c) => tryAssign(e, c, assignAt.slot)} />
        </Popover>
      )}
      {menu && <ChipMenu x={menu.a} rect={menu.rect} onClose={() => setMenu(null)} editable={editable && menu.a.date >= today} />}
      {pending && (
        <ConflictDialog
          employee={pending.employee}
          conflicts={pending.conflicts}
          where={describe(s, pending.slot)}
          onClose={() => setPending(null)}
          onConfirm={() => {
            pending.run()
            setPending(null)
          }}
        />
      )}
      {confirmDiscard && (
        <Modal
          title="Discard all unpublished changes?"
          description={`This undoes ${changes.length} ${changes.length === 1 ? 'change' : 'changes'} and restores the last published schedule. You can’t get them back.`}
          onClose={() => setConfirmDiscard(false)}
          footer={
            <>
              <Button onClick={() => setConfirmDiscard(false)}>Keep editing</Button>
              <Button
                variant="danger"
                onClick={() => {
                  a.discardChanges()
                  setConfirmDiscard(false)
                  toast('Changes discarded')
                }}
              >
                Discard changes
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}

function DeptBand({ dept, count, children }: { dept: Dept; count: number; children: ReactNode }) {
  return (
    <>
      <div className="sticky left-0 col-span-8 flex items-center gap-2 border-t border-line bg-paper px-4 py-2 text-sm">
        <span className={cx('h-2 w-2 rounded-full', deptDot[dept])} />
        <span className="font-semibold">{dept}</span>
        <span className="text-muted">· {count} people</span>
      </div>
      {children}
    </>
  )
}

function Row({ tpl, children }: { tpl: ShiftTemplate; children: ReactNode }) {
  return (
    <>
      <div className="sticky left-0 z-10 flex gap-2.5 border-t border-line bg-white px-4 py-3">
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
  tone: ShiftTemplate['tone']
  today: string
  editable: boolean
  dragOver: string | null
  setDragOver: (k: string | null) => void
  onDrop: (id: string, slot: Slot) => void
  openAssign: (slot: Slot, el: HTMLElement) => void
  openMenu: (a: Assignment, el: HTMLElement) => void
  employees: Employee[]
  bare?: boolean
}

function Cell({ slot, list, needed, tone, today, editable, dragOver, setDragOver, onDrop, openAssign, openMenu, employees, bare }: CellProps) {
  const key = `${slot.date}|${slot.templateId}|${slot.dept}`
  const past = slot.date < today
  const canEdit = editable && !past
  const filled = list.filter(isActive).length
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
      )}
    >
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
            onClick={(ev) => openMenu(x, ev.currentTarget)}
            aria-label={`${e.name}${x.state === 'added' ? ', unpublished' : x.state === 'removed' ? ', removed, unpublished' : ''}`}
            className={cx(
              'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] font-medium transition-shadow',
              canEdit && x.state !== 'removed' && 'cursor-grab active:cursor-grabbing',
              x.state === 'published' && `${toneCls[tone]} hover:shadow-sm`,
              x.state === 'added' && 'border-[1.5px] border-dashed border-forest bg-white text-forest',
              x.state === 'removed' && 'bg-transparent text-muted line-through decoration-bark/70',
            )}
          >
            <span className="truncate">{short}</span>
            <span className="ml-auto flex items-center gap-1">
              {x.overridden && <AlertTriangle className="h-3.5 w-3.5 text-warn" aria-label="Override" />}
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
            <Plus className="h-3 w-3" /> Open slot
          </button>
        ))}
      {!canEdit && openSlots > 0 && <div className="rounded-md bg-bark-50 py-1 text-center text-xs text-bark/80">{openSlots} unfilled</div>}
      {canEdit && openSlots === 0 && (
        <button
          onClick={(ev) => openAssign(slot, ev.currentTarget)}
          aria-label={`Add someone to ${slot.dept}`}
          className={cx(
            'flex items-center justify-center rounded-md py-0.5 text-muted transition-opacity hover:bg-forest-50 hover:text-forest focus-visible:opacity-100',
            bare ? 'w-full border border-dashed border-line py-1 text-xs' : 'opacity-0 group-hover/cell:opacity-100',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          {bare && <span className="ml-1">Add</span>}
        </button>
      )}
      {needed === 0 && list.length === 0 && !bare && <span className="m-auto text-xs text-line group-hover/cell:hidden">—</span>}
    </div>
  )
}

function ChipMenu({ x, rect, onClose, editable }: { x: Assignment; rect: DOMRect; onClose: () => void; editable: boolean }) {
  const { s, a, toast } = useStore()
  const e = s.employees.find((y) => y.id === x.employeeId)!
  const hours = weekHours(s, e.id, startOfWeek(x.date))
  return (
    <Popover anchor={rect} onClose={onClose} width={280}>
      <div className="flex items-center gap-3 border-b border-line p-4">
        <Avatar e={e} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{e.name}</div>
          <div className="text-xs text-muted">{e.position}</div>
        </div>
        <Hours used={hours} max={e.maxHours} />
      </div>
      <div className="px-4 py-3 text-[13px] text-muted">
        {describe(s, x)}
        {x.state === 'added' && <div className="mt-1 font-medium text-forest">{x.movedFrom ? 'Moved · not published yet' : 'New · not published yet'}</div>}
        {x.state === 'removed' && <div className="mt-1 font-medium text-bark">Removed · not published yet</div>}
        {x.overridden && <div className="mt-1 text-warn">Assigned despite: {x.overridden.join(', ').toLowerCase()}</div>}
      </div>
      <div className="flex flex-col gap-1 border-t border-line p-2">
        <a href={`#/team/${e.id}`} onClick={onClose} className="rounded-lg px-3 py-2 text-sm hover:bg-paper">
          View profile
        </a>
        {editable && x.state !== 'removed' && (
          <button
            onClick={() => {
              a.remove(x.id)
              onClose()
              toast(`${e.name.split(' ')[0]} removed from shift`, { label: 'Undo', run: () => (x.state === 'added' ? a.assign({ ...x }) : a.undoRemove(x.id)) })
            }}
            className="rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-50"
          >
            Remove from shift
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
            Undo removal
          </button>
        )}
      </div>
    </Popover>
  )
}

function MobileDay({ days, active, setActive, children }: { days: string[]; active: number; setActive: (i: number) => void; children: ReactNode }) {
  const today = todayKey()
  return (
    <div className="md:hidden">
      <div role="tablist" aria-label="Day" className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {days.map((d, i) => (
          <button
            key={d}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cx(
              'flex w-12 shrink-0 flex-col items-center rounded-xl py-2 text-xs transition-colors',
              i === active ? 'bg-forest text-white' : 'bg-white/60 text-muted',
              d === today && i !== active && 'ring-1 ring-forest',
            )}
          >
            {DAY_SHORT[i]}
            <span className="mt-0.5 text-base font-semibold">{fromKey(d).getDate()}</span>
          </button>
        ))}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-day" /> Published
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded border-[1.5px] border-dashed border-forest bg-white" /> Unpublished
      </span>
      <span className="flex items-center gap-1.5">
        <span className="line-through decoration-bark">Name</span> Removed
      </span>
      <span className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-warn" /> Override
      </span>
      <span className="hidden md:inline">Drag a name to move it. Click a name for details.</span>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="panel p-4" aria-busy="true" aria-label="Loading schedule">
      <div className="grid grid-cols-8 gap-3">
        {Array.from({ length: 8 * 6 }).map((_, i) => (
          <Skeleton key={i} className={i % 8 === 0 ? 'h-12 w-3/4' : 'h-12'} />
        ))}
      </div>
    </div>
  )
}
