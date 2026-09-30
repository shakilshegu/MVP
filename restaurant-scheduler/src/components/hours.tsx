import { AlertTriangle, BedDouble, CheckCircle2, Hourglass, Timer } from 'lucide-react'
import { useStore } from '../lib/store'
import { fmtRange, addDays } from '../lib/date'
import { isActive, weekHours, weekIssues, MIN_REST_HOURS, MAX_DAY_HOURS } from '../lib/validation'
import type { WeekIssue } from '../lib/validation'
import type { Dept } from '../lib/types'
import { DEPTS } from '../lib/types'
import { Avatar, cx, Drawer } from './ui'

const issueIcon: Record<WeekIssue['kind'], typeof Timer> = { rest: BedDouble, dayMax: Hourglass, maxHours: Timer }

export function HoursDrawer({ weekStart, depts, onClose }: { weekStart: string; depts: Dept[]; onClose: () => void }) {
  const { s, branch } = useStore()
  const end = addDays(weekStart, 6)
  const rows = s.employees
    .filter((e) => e.branchId === branch!.id && depts.includes(e.dept))
    .map((e) => {
      const hours = weekHours(s, e.id, weekStart)
      const shifts = s.assignments.filter((a) => a.employeeId === e.id && isActive(a) && a.date >= weekStart && a.date <= end).length
      return { e, hours, shifts, issues: weekIssues(s, e.id, weekStart) }
    })
    .sort((a, b) => b.issues.length - a.issues.length || DEPTS.indexOf(a.e.dept) - DEPTS.indexOf(b.e.dept) || a.e.name.localeCompare(b.e.name))
  const withIssues = rows.filter((r) => r.issues.length).length
  const unscheduled = rows.filter((r) => r.hours === 0 && r.e.status === 'active').length

  return (
    <Drawer title="Hours & rules" onClose={onClose}>
      <p className="text-sm text-muted">
        {fmtRange(weekStart, end)} · {branch!.name}
      </p>

      <div className={cx('mt-4 flex gap-3 rounded-xl p-3 text-sm', withIssues ? 'bg-warn-50 text-warn' : 'bg-forest-50 text-forest')}>
        {withIssues ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
        <div>
          <div className="font-medium">
            {withIssues ? `${withIssues} ${withIssues === 1 ? 'person breaks' : 'people break'} a working-time rule` : 'Everyone is within the rules'}
          </div>
          <div className="mt-0.5 text-[13px] opacity-80">
            {MIN_REST_HOURS}h rest between shifts · max {MAX_DAY_HOURS}h a day · each person’s weekly limit
          </div>
        </div>
      </div>
      {unscheduled > 0 && <p className="mt-2 text-[13px] text-muted">{unscheduled} {unscheduled === 1 ? 'person has' : 'people have'} no shifts this week.</p>}

      <ul className="mt-4 divide-y divide-line">
        {rows.map(({ e, hours, shifts, issues }) => {
          const pct = Math.min(1, hours / e.maxHours)
          return (
            <li key={e.id} className="py-3">
              <div className="flex items-center gap-3">
                <Avatar e={e} size={32} />
                <div className="min-w-0 flex-1">
                  <a href={`#/team/${e.id}`} onClick={onClose} className="block truncate text-sm font-medium hover:underline">
                    {e.name}
                  </a>
                  <div className="text-xs text-muted">
                    {e.dept} · {shifts} {shifts === 1 ? 'shift' : 'shifts'}
                  </div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-sm">
                    <span className={cx('font-semibold', hours > e.maxHours && 'text-danger')}>{hours}h</span>
                    <span className="text-muted"> / {e.maxHours}h</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className={cx('h-full rounded-full', hours > e.maxHours ? 'bg-danger' : pct >= 0.9 ? 'bg-bark' : 'bg-forest')} style={{ width: `${pct * 100}%` }} />
                  </div>
                </div>
              </div>
              {issues.length > 0 && (
                <ul className="ml-11 mt-2 space-y-1">
                  {issues.map((i) => {
                    const Icon = issueIcon[i.kind]
                    return (
                      <li key={i.detail} className="flex items-center gap-1.5 text-xs text-warn">
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {i.detail}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </Drawer>
  )
}
