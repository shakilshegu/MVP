import { useState } from 'react'
import { AlertTriangle, CalendarCheck2, Check, ChevronLeft, ChevronRight, Clock3, Plane, X } from 'lucide-react'
import { availabilityDeadline, deadlinePassed, settingsOf } from '../lib/settings'
import { useStore } from '../lib/store'
import { addDays, dayShort, daysInclusive, fmtDay, fmtRange, fmtRangeYear, fromKey, relTime, startOfWeek, todayKey, WEEK, weekDays, weekdayIndex } from '../lib/date'
import { useT } from '../i18n'
import { isActive, leaveOn, weekHours, weekPattern } from '../lib/validation'
import { navigate } from '../lib/hooks'
import { PREFERRED } from '../lib/types'
import type { Dept, Employee, Leave, Preferred } from '../lib/types'
import { Avatar, Badge, Button, cx, EmptyState, IconButton, PageHeader, Segmented } from '../components/ui'

export function Availability({ week }: { week: string | null }) {
  const { s, a, branch, can, toast, depts, company } = useStore()
  const { t } = useT()
  const [dept, setDept] = useState<'All' | Dept>('All')
  const [view, setView] = useState<'week' | 'pattern'>('week')
  const editable = can('createEmployees')
  const today = todayKey()
  const weekStart = startOfWeek(week ?? today)
  const days = weekDays(weekStart)
  const team = s.employees
    .filter((e) => e.branchId === branch!.id && (dept === 'All' || e.skills.includes(dept)))
    .sort((x, y) => depts.findIndex((d) => d.id === x.dept) - depts.findIndex((d) => d.id === y.dept) || x.name.localeCompare(y.name))
  const freeOn = (e: Employee, i: number) => (view === 'pattern' ? e.availability[i] : !leaveOn(s, e.id, days[i]) && weekPattern(s, e, weekStart)[i])
  const perDay = WEEK.map((i) => team.filter((e) => freeOn(e, i)).length)
  const stateOf = (on: boolean) => t(on ? 'common.available' : 'common.unavailable')
  const deadline = availabilityDeadline(weekStart, settingsOf(company))
  const goWeek = (n: number) => navigate(`/availability?week=${addDays(weekStart, n)}`)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t('availability.title')}
        sub={t('availability.sub')}
        actions={
          <>
            <Segmented label={t('availability.view')} value={view} onChange={setView} options={[{ value: 'week', label: t('availability.viewWeek') }, { value: 'pattern', label: t('availability.viewPattern') }]} />
            <Segmented label={t('common.department')} value={dept} onChange={setDept} options={[{ value: 'All', label: t('common.all') }, ...depts.map((d) => ({ value: d.id, label: d.name }))]} />
          </>
        }
      />
      {view === 'week' && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-white ring-1 ring-line">
            <IconButton label={t('schedule.prevWeek')} onClick={() => goWeek(-7)}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <button onClick={() => navigate('/availability')} disabled={weekStart === startOfWeek(today)} className="h-9 px-2 text-[13px] font-medium text-ink disabled:text-muted">
              {t('common.today')}
            </button>
            <IconButton label={t('schedule.nextWeek')} onClick={() => goWeek(7)}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
          <span className="text-sm font-medium">{fmtRangeYear(weekStart, days[6])}</span>
          {days[6] >= today && (
            <span className={cx('ml-auto flex items-center gap-1.5 text-[13px]', deadlinePassed(deadline) ? 'text-muted' : 'text-forest')}>
              <Clock3 className="h-4 w-4" aria-hidden />
              {t(deadlinePassed(deadline) ? 'availability.deadlinePassed' : 'availability.deadlineOpen', { date: fmtDay(deadline.date), time: deadline.time })}
            </span>
          )}
        </div>
      )}
      {team.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<CalendarCheck2 className="h-5 w-5" />} title={t('availability.emptyTitle')} body={t('availability.emptyBody')} />
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">{t('availability.employee')}</th>
                {WEEK.map((i) => (
                  <th key={i} className={cx('px-1 py-3 text-center font-medium', view === 'week' && days[i] === today && 'text-forest')}>
                    {dayShort(i)}
                    {view === 'week' && <span className="ml-1">{fromKey(days[i]).getDate()}</span>}
                    <div className="font-normal text-muted/80">{t('availability.free', { count: perDay[i] })}</div>
                  </th>
                ))}
                <th className="px-5 py-3 font-medium">{view === 'week' ? t('availability.booked') : t('availability.prefers')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {team.map((e) => {
                const changed = view === 'week' && s.weekAvailability[e.id]?.[weekStart] != null
                const booked = weekHours(s, e.id, weekStart)
                return (
                  <tr key={e.id} className="hover:bg-paper/60">
                    <td className="px-5 py-2.5">
                      <a href={`#/team/${e.id}`} className="flex items-center gap-2.5 hover:underline">
                        <Avatar e={e} size={28} />
                        <span className="font-medium">{e.name}</span>
                      </a>
                      {changed && (
                        <div className="ml-[38px] mt-0.5 flex items-center gap-1.5 text-xs text-bar">
                          {t('availability.changed')}
                          {editable && (
                            <button
                              className="font-medium underline-offset-2 hover:underline"
                              onClick={() => {
                                a.resetWeekAvailability(e.id, weekStart)
                                toast(t('availability.resetDone', { name: e.name.split(' ')[0] }))
                              }}
                            >
                              · {t('availability.reset')}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    {WEEK.map((i) => {
                      if (view === 'pattern') {
                        const on = e.availability[i]
                        return (
                          <td key={i} className="px-1 py-2.5 text-center">
                            <DayToggle
                              on={on}
                              disabled={!editable}
                              label={t('availability.cellA11y', { name: e.name, day: dayShort(i), state: stateOf(on) })}
                              onClick={() => {
                                a.setAvailability(e.id, i, !on)
                                toast(t('availability.toggled', { name: e.name.split(' ')[0], state: stateOf(!on), day: dayShort(i) }))
                              }}
                            />
                          </td>
                        )
                      }
                      const d = days[i]
                      if (leaveOn(s, e.id, d))
                        return (
                          <td key={i} className="px-1 py-2.5 text-center">
                            <span title={t('availability.onLeave')} className="inline-flex h-8 w-10 items-center justify-center rounded-lg bg-[#F6EEEC] text-[#8B4A42]">
                              <Plane className="h-4 w-4" aria-label={t('availability.onLeave')} />
                            </span>
                          </td>
                        )
                      const on = weekPattern(s, e, weekStart)[i]
                      return (
                        <td key={i} className="px-1 py-2.5 text-center">
                          <DayToggle
                            on={on}
                            differs={on !== e.availability[i]}
                            disabled={!editable || d < today}
                            label={t('availability.cellA11y', { name: e.name, day: fmtDay(d), state: stateOf(on) })}
                            onClick={() => {
                              a.setWeekAvailability(e.id, weekStart, i, !on)
                              toast(t('availability.toggledWeek', { name: e.name.split(' ')[0], state: stateOf(!on), date: fmtDay(d) }))
                            }}
                          />
                        </td>
                      )
                    })}
                    <td className="px-5 py-2.5">
                      {view === 'week' ? (
                        <span className="whitespace-nowrap text-[13px]">
                          <span className={cx('font-semibold', booked > e.maxHours && 'text-danger')}>{booked}h</span>
                          <span className="text-muted"> / {e.maxHours}h</span>
                        </span>
                      ) : (
                        <select
                          aria-label={t('availability.prefA11y', { name: e.name })}
                          disabled={!editable}
                          value={e.preferred}
                          onChange={(ev) => a.setPreferred(e.id, ev.target.value as Preferred)}
                          className="h-8 rounded-lg border border-line bg-white px-2 text-[13px]"
                        >
                          {PREFERRED.map((p) => (
                            <option key={p} value={p}>
                              {t(`preferred.${p}`)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <span>{view === 'week' ? t('availability.weekHint') : t('availability.hint')}</span>
        {view === 'week' && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-4 rounded ring-2 ring-bar" /> {t('availability.changed')}
            </span>
            <span className="flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5 text-[#8B4A42]" /> {t('availability.onLeave')}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function DayToggle({ on, differs, disabled, label, onClick }: { on: boolean; differs?: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={cx(
        'inline-flex h-8 w-10 items-center justify-center rounded-lg transition-colors disabled:cursor-default disabled:opacity-60',
        on ? 'bg-forest-50 text-forest hover:bg-forest-100' : 'bg-bark-50 text-bark/70 hover:bg-[#EEDDD9]',
        differs && 'ring-2 ring-bar',
      )}
    >
      {on ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
    </button>
  )
}

export function LeaveRequests() {
  const { s, a, branch, can, toast } = useStore()
  const { t } = useT()
  const [tab, setTab] = useState<Leave['status']>('pending')
  const ids = new Set(s.employees.filter((e) => e.branchId === branch!.id).map((e) => e.id))
  const all = s.leaves.filter((l) => ids.has(l.employeeId))
  const list = all.filter((l) => l.status === tab).sort((x, y) => (tab === 'pending' ? x.from.localeCompare(y.from) : y.from.localeCompare(x.from)))
  const count = (st: Leave['status']) => all.filter((l) => l.status === st).length

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t('leave.title')} sub={t('leave.sub')} />
      <div className="mb-4">
        <Segmented
          label={t('leave.status')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: t('leave.pending', { count: count('pending') }) },
            { value: 'approved', label: t('leave.approved', { count: count('approved') }) },
            { value: 'declined', label: t('leave.declined', { count: count('declined') }) },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Plane className="h-5 w-5" />}
            title={t(tab === 'pending' ? 'leave.emptyPending' : tab === 'approved' ? 'leave.emptyApproved' : 'leave.emptyDeclined')}
            body={t(tab === 'pending' ? 'leave.emptyPendingBody' : 'leave.emptyOther')}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((l) => {
            const e = s.employees.find((x) => x.id === l.employeeId)!
            const clashes = s.assignments.filter((x) => x.employeeId === e.id && isActive(x) && x.date >= l.from && x.date <= l.to)
            const days = daysInclusive(l.from, l.to)
            return (
              <li key={l.id} className="panel p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar e={e} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`#/team/${e.id}`} className="font-medium hover:underline">
                        {e.name}
                      </a>
                      <span className="text-[13px] text-muted">{e.position}</span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium">{t(`leaveKind.${l.kind}`)}</span> · {fmtRange(l.from, l.to)} · {t('common.days', { count: days })}
                      {days <= 7 && <span className="text-muted"> ({[...new Set(Array.from({ length: days }, (_, i) => dayShort((weekdayIndex(l.from) + i) % 7)))].join(', ')})</span>}
                    </div>
                    {l.note && <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-[13px] text-ink/80">“{l.note}”</p>}
                    <div className="mt-2 text-xs text-muted">{t('leave.requested', { when: relTime(l.requestedAt) })}</div>
                  </div>
                  {l.status !== 'pending' && <Badge tone={l.status === 'approved' ? 'green' : 'neutral'}>{t(l.status === 'approved' ? 'leave.badgeApproved' : 'leave.badgeDeclined')}</Badge>}
                </div>
                {l.status === 'pending' && clashes.length > 0 && (
                  <div className="mt-4 flex gap-2 rounded-xl bg-warn-50 p-3 text-[13px] text-warn">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {t('leave.clash', { name: e.name.split(' ')[0], count: clashes.length, dates: clashes.map((c) => fmtDay(c.date)).join(', ') })}
                    </span>
                  </div>
                )}
                {l.status === 'pending' && can('approveLeave') && (
                  <div className="mt-4 flex gap-2 border-t border-line pt-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        a.decideLeave(l.id, 'approved')
                        toast(
                          clashes.length ? t('leave.approvedClash', { count: clashes.length }) : t('dashboard.leaveApproved', { name: e.name.split(' ')[0] }),
                          clashes.length ? { label: t('common.openSchedule'), run: () => (window.location.hash = `/schedule?week=${clashes[0].date}`) } : undefined,
                        )
                      }}
                    >
                      {t('common.approve')}
                    </Button>
                    <Button
                      size="sm"
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
    </div>
  )
}
