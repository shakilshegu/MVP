import { useState } from 'react'
import { AlertTriangle, CalendarCheck2, Check, Plane, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { dayShort, daysInclusive, fmtDay, fmtRange, relTime, WEEK, weekdayIndex } from '../lib/date'
import { useT } from '../i18n'
import { deptName } from '../i18n/format'
import { isActive } from '../lib/validation'
import { DEPTS, PREFERRED } from '../lib/types'
import type { Dept, Leave, Preferred } from '../lib/types'
import { Avatar, Badge, Button, cx, EmptyState, PageHeader, Segmented } from '../components/ui'

export function Availability() {
  const { s, a, branch, can, toast } = useStore()
  const { t } = useT()
  const [dept, setDept] = useState<'All' | Dept>('All')
  const editable = can('createEmployees')
  const team = s.employees
    .filter((e) => e.branchId === branch!.id && (dept === 'All' || e.dept === dept))
    .sort((x, y) => DEPTS.indexOf(x.dept) - DEPTS.indexOf(y.dept) || x.name.localeCompare(y.name))
  const perDay = WEEK.map((i) => team.filter((e) => e.availability[i]).length)
  const stateOf = (on: boolean) => t(on ? 'common.available' : 'common.unavailable')

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t('availability.title')}
        sub={t('availability.sub')}
        actions={<Segmented label={t('common.department')} value={dept} onChange={setDept} options={[{ value: 'All', label: t('common.all') }, ...DEPTS.map((d) => ({ value: d, label: deptName(t, d) }))]} />}
      />
      {team.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<CalendarCheck2 className="h-5 w-5" />} title={t('availability.emptyTitle')} body={t('availability.emptyBody')} />
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">{t('availability.employee')}</th>
                {WEEK.map((i) => (
                  <th key={i} className="px-1 py-3 text-center font-medium">
                    {dayShort(i)}
                    <div className="font-normal text-muted/80">{t('availability.free', { count: perDay[i] })}</div>
                  </th>
                ))}
                <th className="px-5 py-3 font-medium">{t('availability.prefers')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {team.map((e) => (
                <tr key={e.id} className="hover:bg-paper/60">
                  <td className="px-5 py-2.5">
                    <a href={`#/team/${e.id}`} className="flex items-center gap-2.5 hover:underline">
                      <Avatar e={e} size={28} />
                      <span className="font-medium">{e.name}</span>
                    </a>
                  </td>
                  {e.availability.map((on, i) => (
                    <td key={i} className="px-1 py-2.5 text-center">
                      <button
                        disabled={!editable}
                        onClick={() => {
                          a.setAvailability(e.id, i, !on)
                          toast(t('availability.toggled', { name: e.name.split(' ')[0], state: stateOf(!on), day: dayShort(i) }))
                        }}
                        aria-pressed={on}
                        aria-label={t('availability.cellA11y', { name: e.name, day: dayShort(i), state: stateOf(on) })}
                        className={cx(
                          'inline-flex h-8 w-10 items-center justify-center rounded-lg transition-colors disabled:cursor-default',
                          on ? 'bg-forest-50 text-forest hover:bg-forest-100' : 'bg-bark-50 text-bark/70 hover:bg-[#EEDDD9]',
                        )}
                      >
                        {on ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </button>
                    </td>
                  ))}
                  <td className="px-5 py-2.5">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">{t('availability.hint')}</p>
    </div>
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
    <div className="mx-auto max-w-3xl">
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
