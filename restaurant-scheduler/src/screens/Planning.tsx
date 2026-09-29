import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3, Hourglass, Plus, Send, Trash2 } from 'lucide-react'
import { branchChanges, useStore } from '../lib/store'
import { navigate } from '../lib/hooks'
import { addDays, DAY_SHORT, daysInclusive, fmtLong, fmtRange, fromKey, hoursBetween, pad, startOfWeek, todayKey, toKey, toMin } from '../lib/date'
import { isActive } from '../lib/validation'
import { DEPTS } from '../lib/types'
import type { Dept, ShiftTemplate, Tone } from '../lib/types'
import { Avatar, Badge, Button, cx, deptDot, Drawer, EmptyState, Field, PageHeader, toneCls } from '../components/ui'

function coverage(s: ReturnType<typeof useStore>['s'], branchId: string, date: string) {
  let need = 0
  let got = 0
  for (const t of s.templates)
    for (const d of DEPTS) {
      need += t.needed[d]
      got += Math.min(t.needed[d], s.assignments.filter((x) => x.branchId === branchId && isActive(x) && x.date === date && x.templateId === t.id && x.dept === d).length)
    }
  return { need, got }
}

export function Dashboard() {
  const { s, a, me, branch, can, pendingLeave, toast } = useStore()
  const today = todayKey()
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const changes = branchChanges(s, branch!.id)
  const next7 = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const open7 = next7.reduce((n, d) => {
    const c = coverage(s, branch!.id, d)
    return n + (c.need - c.got)
  }, 0)
  const todays = s.assignments
    .filter((x) => x.branchId === branch!.id && x.date === today && isActive(x))
    .map((x) => ({ x, e: s.employees.find((e) => e.id === x.employeeId)!, t: s.templates.find((t) => t.id === x.templateId)! }))
    .filter((r) => r.e && r.t)
    .sort((p, q) => DEPTS.indexOf(p.x.dept) - DEPTS.indexOf(q.x.dept) || toMin(p.t.start) - toMin(q.t.start))
  const nowMin = hour * 60 + new Date().getMinutes()
  const axisStart = 5 * 60
  const axisLen = 22 * 60
  const pos = (m: number) => `${(Math.max(0, Math.min(axisLen, m - axisStart)) / axisLen) * 100}%`

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={`${greet}, ${me?.name.split(' ')[0]}`} sub={`${fmtLong(today)} · ${branch!.name}`} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <a href="#/schedule" className="panel p-4 transition-shadow hover:shadow-md">
          <div className="text-[13px] text-muted">Working today</div>
          <div className="mt-1 text-2xl font-semibold">{new Set(todays.map((r) => r.e.id)).size}</div>
        </a>
        <a href="#/schedule" className={cx('panel p-4 transition-shadow hover:shadow-md', open7 > 0 && 'border-bark/30')}>
          <div className="text-[13px] text-muted">Open slots, next 7 days</div>
          <div className={cx('mt-1 text-2xl font-semibold', open7 > 0 && 'text-bark')}>{open7}</div>
        </a>
        <a href="#/leave" className="panel p-4 transition-shadow hover:shadow-md">
          <div className="text-[13px] text-muted">Leave to review</div>
          <div className="mt-1 text-2xl font-semibold">{pendingLeave.length}</div>
        </a>
      </div>

      {changes.length > 0 && (
        <a href="#/review" className="mb-6 flex items-center gap-3 rounded-xl bg-forest px-5 py-4 text-white hover:bg-forest-600">
          {s.pendingApproval[branch!.id] ? <Hourglass className="h-5 w-5 shrink-0" /> : <Send className="h-5 w-5 shrink-0" />}
          <span className="flex-1 text-sm">
            <span className="font-medium">
              {changes.length} unpublished {changes.length === 1 ? 'change' : 'changes'}
            </span>
            <span className="text-white/75">{s.pendingApproval[branch!.id] ? ' · waiting for approval' : ' · your team won’t see these until you publish'}</span>
          </span>
          <span className="text-sm font-medium">Review</span>
        </a>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold">Today’s shifts</h2>
            <a href="#/schedule" className="text-[13px] font-medium text-forest hover:underline">
              Open schedule
            </a>
          </div>
          {todays.length === 0 ? (
            <EmptyState icon={<Clock3 className="h-5 w-5" />} title="No one is scheduled today" body="Fill today’s shifts from the weekly schedule." action={<Button onClick={() => navigate('/schedule')}>Open schedule</Button>} />
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
                {todays.map(({ x, e, t }) => {
                  const st = toMin(t.start)
                  let en = toMin(t.end)
                  if (en <= st) en += 1440
                  return (
                    <li key={x.id} className="flex items-center gap-3">
                      <a href={`#/team/${e.id}`} className="flex w-[128px] shrink-0 items-center gap-2 hover:underline">
                        <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', deptDot[x.dept])} />
                        <span className="truncate text-sm">{e.name}</span>
                      </a>
                      <div className="relative hidden h-7 flex-1 sm:block">
                        <div className={cx('absolute inset-y-0 flex items-center rounded-md px-2 text-xs font-medium', toneCls[t.tone])} style={{ left: pos(st), width: `calc(${pos(en)} - ${pos(st)})` }}>
                          <span className="truncate">
                            {t.name} {t.start}–{t.end}
                          </span>
                        </div>
                      </div>
                      <span className={cx('rounded-md px-2 py-0.5 text-xs font-medium sm:hidden', toneCls[t.tone])}>
                        {t.start}–{t.end}
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
              <h2 className="text-sm font-semibold">Pending requests</h2>
              <a href="#/leave" className="text-[13px] font-medium text-forest hover:underline">
                All requests
              </a>
            </div>
            {pendingLeave.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted">No requests waiting.</p>
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
                            {l.kind} · {fmtRange(l.from, l.to)} ({daysInclusive(l.from, l.to)}d)
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
                              toast(`Leave approved for ${e.name.split(' ')[0]}`)
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              a.decideLeave(l.id, 'declined')
                              toast(`Leave declined for ${e.name.split(' ')[0]}`)
                            }}
                          >
                            Decline
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
            <h2 className="text-sm font-semibold">Next 7 days</h2>
            <div className="mt-4 flex items-end gap-2">
              {next7.map((d) => {
                const c = coverage(s, branch!.id, d)
                const pct = c.need ? c.got / c.need : 1
                return (
                  <a key={d} href={`#/schedule?week=${startOfWeek(d)}`} className="group flex flex-1 flex-col items-center gap-1.5" title={`${c.got} of ${c.need} slots filled`}>
                    <span className="relative h-16 w-full overflow-hidden rounded-md bg-paper">
                      <span className={cx('absolute inset-x-0 bottom-0 rounded-md', pct < 1 ? 'bg-bark/70' : 'bg-forest')} style={{ height: `${pct * 100}%` }} />
                    </span>
                    <span className={cx('text-[11px]', d === today ? 'font-semibold text-forest' : 'text-muted')}>{DAY_SHORT[(fromKey(d).getDay() + 6) % 7]}</span>
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
  const today = todayKey()
  const first = (month ?? today.slice(0, 7)) + '-01'
  const d0 = fromKey(first)
  const gridStart = startOfWeek(first)
  const nextMonth = toKey(new Date(d0.getFullYear(), d0.getMonth() + 1, 1))
  const prevMonth = toKey(new Date(d0.getFullYear(), d0.getMonth() - 1, 1))
  const weeks = Math.ceil((daysInclusive(gridStart, addDays(nextMonth, -1))) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i))
  const title = d0.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

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
        sub={`${need ? Math.round((got / need) * 100) : 0}% of slots filled · ${need - got} open`}
        actions={
          <div className="flex items-center rounded-lg bg-white ring-1 ring-line">
            <button aria-label="Previous month" onClick={() => navigate(`/month?m=${prevMonth.slice(0, 7)}`)} className="inline-flex h-9 w-9 items-center justify-center text-muted hover:text-ink">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => navigate('/month')} className="h-9 px-2 text-[13px] font-medium">
              Today
            </button>
            <button aria-label="Next month" onClick={() => navigate(`/month?m=${nextMonth.slice(0, 7)}`)} className="inline-flex h-9 w-9 items-center justify-center text-muted hover:text-ink">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />
      <div className="panel overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-paper text-center text-xs font-medium text-muted">
          {DAY_SHORT.map((d) => (
            <div key={d} className="py-2">
              {d}
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
                  {c.got > 0 && <span className="hidden text-[11px] text-muted sm:inline">{people} ppl</span>}
                </div>
                {inMonth && (
                  <div className="mt-3">
                    {c.got === 0 ? (
                      <span className="text-[11px] text-muted/80">{d >= today ? 'Not scheduled' : ''}</span>
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
      <p className="mt-3 text-xs text-muted">Click a day to open that week.</p>
    </div>
  )
}

const TONES: Tone[] = ['morning', 'day', 'evening', 'night']

export function ShiftTemplates() {
  const { s, can } = useStore()
  const [editing, setEditing] = useState<ShiftTemplate | 'new' | null>(null)
  const sorted = [...s.templates].sort((a, b) => toMin(a.start) - toMin(b.start))
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Shift templates"
        sub="The shifts you schedule every day. Changing a time updates every shift that uses it."
        actions={
          can('editShifts') && (
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> New shift
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
          {sorted.map((t) => {
            const st = toMin(t.start) / 60
            let en = toMin(t.end) / 60
            if (en <= st) en += 24
            const staff = DEPTS.reduce((n, d) => n + t.needed[d], 0)
            return (
              <li key={t.id}>
                <button onClick={() => can('editShifts') && setEditing(t)} className="flex w-full flex-col gap-3 px-5 py-4 text-left hover:bg-paper sm:flex-row sm:items-center">
                  <div className="w-[196px] shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.name}</span>
                      <span className="text-xs text-muted">{hoursBetween(t.start, t.end)}h</span>
                    </div>
                    <div className="text-sm text-muted">
                      {t.start}–{t.end} · {staff} staff
                    </div>
                  </div>
                  <div className="relative h-8 w-full flex-1 rounded-md bg-paper">
                    <div className={cx('absolute inset-y-0 flex items-center gap-2 rounded-md px-2 text-[11px] font-medium', toneCls[t.tone])} style={{ left: `${(st / 28) * 100}%`, width: `${((en - st) / 28) * 100}%` }}>
                      {DEPTS.filter((d) => t.needed[d]).map((d) => (
                        <span key={d} className="flex items-center gap-1 whitespace-nowrap">
                          <span className={cx('h-1.5 w-1.5 rounded-full', deptDot[d])} />
                          {t.needed[d]}
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
  const [f, setF] = useState<ShiftTemplate>(() => t ?? { id: Math.random().toString(36).slice(2, 9), name: '', start: '12:00', end: '20:00', tone: 'day', needed: { Bar: 0, Service: 1, Kitchen: 1 } })
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const upcoming = t ? s.assignments.filter((x) => x.templateId === t.id && isActive(x) && x.date >= todayKey()).length : 0

  const save = () => {
    if (!f.name.trim()) return setError('Give the shift a name, like “Brunch”.')
    if (f.start === f.end) return setError('Start and end can’t be the same time.')
    if (s.templates.some((x) => x.id !== f.id && x.name.toLowerCase() === f.name.trim().toLowerCase())) return setError('There’s already a shift with that name.')
    a.saveTemplate({ ...f, name: f.name.trim() })
    toast(t ? `${f.name} updated` : `${f.name} created`)
    onClose()
  }
  const setNeed = (d: Dept, n: number) => setF((p) => ({ ...p, needed: { ...p.needed, [d]: Math.max(0, Math.min(9, n)) } }))

  return (
    <Drawer
      title={t ? `Edit ${t.name}` : 'New shift'}
      onClose={onClose}
      footer={
        <>
          {t && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label="Delete shift">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>
            {t ? 'Save changes' : 'Create shift'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Name" htmlFor="t-name" error={error}>
          <input id="t-name" autoFocus className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Brunch" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" htmlFor="t-start">
            <input id="t-start" type="time" className="input" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
          </Field>
          <Field label="Ends" htmlFor="t-end" hint={toMin(f.end) <= toMin(f.start) ? 'Ends after midnight' : undefined}>
            <input id="t-end" type="time" className="input" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
          </Field>
        </div>
        <p className="-mt-2 text-[13px] text-muted">{hoursBetween(f.start, f.end)} hours</p>
        <Field label="Colour">
          <div className="flex gap-2">
            {TONES.map((tone) => (
              <button
                key={tone}
                onClick={() => setF({ ...f, tone })}
                aria-pressed={f.tone === tone}
                className={cx('h-9 flex-1 rounded-lg text-xs font-medium capitalize ring-offset-2', toneCls[tone], f.tone === tone && 'ring-2 ring-forest')}
              >
                {tone}
              </button>
            ))}
          </div>
        </Field>
        <div>
          <div className="mb-1.5 text-sm font-medium">Staff needed</div>
          <p className="mb-3 text-[13px] text-muted">Empty spots show up as open slots on the schedule.</p>
          <div className="space-y-2">
            {DEPTS.map((d) => (
              <div key={d} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <span className={cx('h-2 w-2 rounded-full', deptDot[d])} />
                  {d}
                </span>
                <div className="flex items-center gap-1">
                  <button aria-label={`Fewer ${d}`} onClick={() => setNeed(d, f.needed[d] - 1)} className="h-8 w-8 rounded-lg bg-white text-lg leading-none ring-1 ring-line hover:ring-forest/40">
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
                    {f.needed[d]}
                  </span>
                  <button aria-label={`More ${d}`} onClick={() => setNeed(d, f.needed[d] + 1)} className="h-8 w-8 rounded-lg bg-white text-lg leading-none ring-1 ring-line hover:ring-forest/40">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {t && upcoming > 0 && <Badge tone="neutral">Used by {upcoming} upcoming shifts</Badge>}
        {confirmDelete && (
          <div className="rounded-xl border border-danger/30 bg-danger-50 p-4">
            <div className="text-sm font-medium text-danger">Delete {t?.name}?</div>
            <p className="mt-1 text-[13px] text-ink/75">
              {upcoming ? `This also removes ${upcoming} upcoming shifts from the schedule.` : 'No upcoming shifts use it.'} This can’t be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  a.deleteTemplate(t!.id)
                  toast(`${t!.name} deleted`)
                  onClose()
                }}
              >
                Delete shift
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  )
}

