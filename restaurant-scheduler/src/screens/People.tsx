import { useState } from 'react'
import { AlertTriangle, CalendarCheck2, Check, Plane, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { DAY_SHORT, daysInclusive, fmtDay, fmtRange, relTime, weekdayIndex } from '../lib/date'
import { isActive } from '../lib/validation'
import { DEPTS, PREFERRED } from '../lib/types'
import type { Dept, Leave, Preferred } from '../lib/types'
import { Avatar, Badge, Button, cx, EmptyState, PageHeader, Segmented } from '../components/ui'

export function Availability() {
  const { s, a, branch, can, toast } = useStore()
  const [dept, setDept] = useState<'All' | Dept>('All')
  const editable = can('createEmployees')
  const team = s.employees
    .filter((e) => e.branchId === branch!.id && (dept === 'All' || e.dept === dept))
    .sort((x, y) => DEPTS.indexOf(x.dept) - DEPTS.indexOf(y.dept) || x.name.localeCompare(y.name))
  const perDay = DAY_SHORT.map((_, i) => team.filter((e) => e.availability[i]).length)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Availability"
        sub="When each person can work. Unavailable days are flagged when you assign shifts."
        actions={<Segmented label="Department" value={dept} onChange={setDept} options={[{ value: 'All', label: 'All' }, ...DEPTS.map((d) => ({ value: d, label: d }))]} />}
      />
      {team.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<CalendarCheck2 className="h-5 w-5" />} title="No one to show" body="Add people on the Team page to set their availability." />
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Employee</th>
                {DAY_SHORT.map((d, i) => (
                  <th key={d} className="px-1 py-3 text-center font-medium">
                    {d}
                    <div className="font-normal text-muted/80">{perDay[i]} free</div>
                  </th>
                ))}
                <th className="px-5 py-3 font-medium">Prefers</th>
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
                          toast(`${e.name.split(' ')[0]} is now ${on ? 'unavailable' : 'available'} on ${DAY_SHORT[i]}`)
                        }}
                        aria-pressed={on}
                        aria-label={`${e.name}, ${DAY_SHORT[i]}: ${on ? 'available' : 'unavailable'}`}
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
                      aria-label={`${e.name} preferred shifts`}
                      disabled={!editable}
                      value={e.preferred}
                      onChange={(ev) => a.setPreferred(e.id, ev.target.value as Preferred)}
                      className="h-8 rounded-lg border border-line bg-white px-2 text-[13px]"
                    >
                      {PREFERRED.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Click a day to switch it. Changes save straight away.</p>
    </div>
  )
}

export function LeaveRequests() {
  const { s, a, branch, can, toast } = useStore()
  const [tab, setTab] = useState<Leave['status']>('pending')
  const ids = new Set(s.employees.filter((e) => e.branchId === branch!.id).map((e) => e.id))
  const all = s.leaves.filter((l) => ids.has(l.employeeId))
  const list = all.filter((l) => l.status === tab).sort((x, y) => (tab === 'pending' ? x.from.localeCompare(y.from) : y.from.localeCompare(x.from)))
  const count = (st: Leave['status']) => all.filter((l) => l.status === st).length

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Leave requests" sub="Approved leave blocks those days on the schedule." />
      <div className="mb-4">
        <Segmented
          label="Status"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: `Pending (${count('pending')})` },
            { value: 'approved', label: `Approved (${count('approved')})` },
            { value: 'declined', label: `Declined (${count('declined')})` },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<Plane className="h-5 w-5" />} title={tab === 'pending' ? 'No requests waiting' : `No ${tab} requests`} body={tab === 'pending' ? 'New time-off requests from your team will show up here.' : 'Nothing here yet.'} />
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
                      <span className="font-medium">{l.kind}</span> · {fmtRange(l.from, l.to)} · {days} {days === 1 ? 'day' : 'days'}
                      {days <= 7 && <span className="text-muted"> ({[...new Set(Array.from({ length: days }, (_, i) => DAY_SHORT[(weekdayIndex(l.from) + i) % 7]))].join(', ')})</span>}
                    </div>
                    {l.note && <p className="mt-2 rounded-lg bg-paper px-3 py-2 text-[13px] text-ink/80">“{l.note}”</p>}
                    <div className="mt-2 text-xs text-muted">Requested {relTime(l.requestedAt).toLowerCase()}</div>
                  </div>
                  {l.status !== 'pending' && <Badge tone={l.status === 'approved' ? 'green' : 'neutral'}>{l.status === 'approved' ? 'Approved' : 'Declined'}</Badge>}
                </div>
                {l.status === 'pending' && clashes.length > 0 && (
                  <div className="mt-4 flex gap-2 rounded-xl bg-warn-50 p-3 text-[13px] text-warn">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {e.name.split(' ')[0]} has {clashes.length} {clashes.length === 1 ? 'shift' : 'shifts'} in this period ({clashes.map((c) => fmtDay(c.date)).join(', ')}). If you approve, reassign them.
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
                        toast(clashes.length ? `Approved · ${clashes.length} shifts now need someone else` : `Leave approved for ${e.name.split(' ')[0]}`, clashes.length ? { label: 'Open schedule', run: () => (window.location.hash = `/schedule?week=${clashes[0].date}`) } : undefined)
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
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
    </div>
  )
}
