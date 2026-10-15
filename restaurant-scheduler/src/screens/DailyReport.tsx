import { useState } from 'react'
import { Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Crown, Download, Loader2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { navigate } from '../lib/hooks'
import { addDays, fmtLong, fmtTime, todayKey, toMin } from '../lib/date'
import { isActive } from '../lib/validation'
import { doneCount, shiftItems, shiftPhase } from '../lib/report'
import { settingsOf } from '../lib/settings'
import type { ReportItem, ShiftPhase } from '../lib/report'
import type { Assignment, Dept, Employee, ShiftTemplate } from '../lib/types'
import { useT } from '../i18n'
import { Avatar, Badge, Button, cx, DeptTag, EmptyState, IconButton, PageHeader, Segmented, toneCls } from '../components/ui'

const isComplete = (r: { items: unknown[]; done: number }) => r.items.length > 0 && r.done === r.items.length

export type ReportRow = { a: Assignment; e: Employee; tpl: ShiftTemplate; items: ReportItem[]; phase: ShiftPhase; done: number }

/** Checklist progress per shift and employee for one day (CR-04). */
export function DailyReport({ date }: { date: string | null }) {
  const { s, a, branch, me, can, toast, depts, company } = useStore()
  const { t } = useT()
  const today = todayKey()
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today
  const [dept, setDept] = useState<'All' | Dept>('All')
  const [person, setPerson] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [exporting, setExporting] = useState(false)
  const canTick = can('editShifts')

  const all: ReportRow[] = s.assignments
    .filter((x) => x.branchId === branch!.id && x.date === day && isActive(x))
    .map((x) => {
      const items = shiftItems(s, x)
      return { a: x, e: s.employees.find((e) => e.id === x.employeeId)!, tpl: s.templates.find((y) => y.id === x.templateId)!, items, phase: shiftPhase(s, x), done: doneCount(items) }
    })
    .filter((r) => r.e && r.tpl)
  const people = [...new Map(all.map((r) => [r.e.id, r.e])).values()].sort((x, y) => x.name.localeCompare(y.name))
  const rows = all
    .filter((r) => (dept === 'All' || r.a.dept === dept) && (!person || r.e.id === person))
    .filter((r) => !onlyOpen || (r.phase !== 'upcoming' && r.done < r.items.length))
    .filter((r) => showComplete || onlyOpen || !isComplete(r))
    .sort((p, q) => toMin(p.tpl.start) - toMin(q.tpl.start) || depts.findIndex((d) => d.id === p.a.dept) - depts.findIndex((d) => d.id === q.a.dept) || Number(!!q.a.isLeader) - Number(!!p.a.isLeader) || p.e.name.localeCompare(q.e.name))

  const completeCount = all.filter((r) => (dept === 'All' || r.a.dept === dept) && (!person || r.e.id === person) && isComplete(r)).length
  const scope = all.filter((r) => (dept === 'All' || r.a.dept === dept) && (!person || r.e.id === person))
  const total = scope.reduce((n, r) => n + r.items.length, 0)
  const done = scope.reduce((n, r) => n + r.done, 0)
  const missed = scope.filter((r) => r.phase === 'over' && r.done < r.items.length).length
  const groups = rows.reduce<{ tpl: ShiftTemplate; rows: ReportRow[] }[]>((m, r) => {
    const g = m.find((x) => x.tpl.id === r.tpl.id)
    if (g) g.rows.push(r)
    else m.push({ tpl: r.tpl, rows: [r] })
    return m
  }, [])
  const go = (d: string) => navigate(d === today ? '/report' : `/report?date=${d}`)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t('report.title')}
        sub={`${fmtLong(day)} · ${branch!.name}`}
        actions={
          <>
            <div className="flex items-center rounded-lg bg-white ring-1 ring-line">
              <IconButton label={t('report.prevDay')} onClick={() => go(addDays(day, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <input type="date" aria-label={t('report.pickDay')} value={day} max={addDays(today, 14)} onChange={(e) => e.target.value && go(e.target.value)} className="h-9 bg-transparent px-1 text-[13px] font-medium" />
              <IconButton label={t('report.nextDay')} onClick={() => go(addDays(day, 1))}>
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
            {day !== today && <Button onClick={() => go(today)}>{t('common.today')}</Button>}
            <Button
              disabled={!all.length || exporting}
              onClick={async () => {
                setExporting(true)
                try {
                  const { downloadReportPdf } = await import('../lib/reportPdf')
                  await downloadReportPdf({ s, branch: branch!, me, date: day, rows: scope })
                  toast(t('report.pdfDone'))
                } catch {
                  toast(t('schedule.pdfFail'))
                } finally {
                  setExporting(false)
                }
              }}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {t('report.pdf')}
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="panel p-3 sm:p-4">
          <div className="text-xs text-muted sm:text-[13px]">{t('report.onShift')}</div>
          <div className="mt-1 text-xl font-semibold sm:text-2xl">{new Set(scope.map((r) => r.e.id)).size}</div>
        </div>
        <div className="panel p-3 sm:p-4">
          <div className="text-xs text-muted sm:text-[13px]">{t('report.tasksDone')}</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl font-semibold sm:text-2xl">
              {done}/{total}
            </span>
            {total > 0 && <span className="text-sm text-muted">{Math.round((done / total) * 100)}%</span>}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-forest" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
        <div className={cx('panel p-3 sm:p-4', missed > 0 && 'border-bark/30')}>
          <div className="text-xs text-muted sm:text-[13px]">{t('report.missed')}</div>
          <div className={cx('mt-1 text-xl font-semibold sm:text-2xl', missed > 0 && 'text-bark')}>{missed}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented label={t('common.department')} value={dept} onChange={setDept} options={[{ value: 'All', label: t('common.all') }, ...depts.map((d) => ({ value: d.id, label: d.name }))]} />
        <select aria-label={t('report.employee')} value={person} onChange={(e) => setPerson(e.target.value)} className="h-10 rounded-lg border border-line bg-white px-3 text-[13px]">
          <option value="">{t('report.everyone')}</option>
          {people.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-[13px]">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} className="h-4 w-4 accent-forest" />
          {t('report.onlyOpen')}
        </label>
      </div>

      {settingsOf(company).leadersSeeReport && <p className="-mt-1 mb-4 text-xs text-muted">{t('report.leadersSee')}</p>}
      {!onlyOpen && completeCount > 0 && (
        <button onClick={() => setShowComplete((v) => !v)} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sage-dark py-2.5 text-[13px] font-medium text-forest hover:bg-white/60">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {showComplete ? t('report.hideComplete') : t('report.showComplete', { count: completeCount })}
        </button>
      )}

      {rows.length === 0 && completeCount > 0 && !showComplete && !onlyOpen ? null : rows.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<ClipboardCheck className="h-5 w-5" />} title={all.length ? t('report.noMatchTitle') : t('report.emptyTitle')} body={all.length ? t('report.noMatchBody') : t('report.emptyBody')} />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ tpl, rows }) => (
            <section key={tpl.id}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className={cx('rounded-md px-2 py-0.5 text-xs font-medium', toneCls[tpl.tone])}>{tpl.name}</span>
                <span className="font-normal text-muted">
                  {tpl.start}–{tpl.end}
                </span>
                {rows.some((r) => r.a.isLeader) && (
                  <span className="flex items-center gap-1 text-xs font-normal text-muted">
                    · <Crown className="h-3.5 w-3.5 text-bar" aria-hidden />
                    {t('report.ledBy', { names: rows.filter((r) => r.a.isLeader).map((r) => r.e.name.split(' ')[0]).join(', ') })}
                  </span>
                )}
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {rows.map((r) => (
                  <ShiftCard key={r.a.id} r={r} canTick={canTick} onTick={(id, on) => a.tickItem(r.a.id, id, on)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function ShiftCard({ r, canTick, onTick }: { r: ReportRow; canTick: boolean; onTick: (id: string, on: boolean) => void }) {
  const { t } = useT()
  const { e, items, phase, done } = r
  const complete = items.length > 0 && done === items.length
  return (
    <article className={cx('panel overflow-hidden', phase === 'over' && !complete && items.length > 0 && 'border-bark/30')}>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Avatar e={e} size={32} />
        <div className="min-w-0 flex-1">
          <a href={`#/team/${e.id}`} className="flex items-center gap-1.5 truncate text-sm font-semibold hover:underline">
            {e.name}
            {r.a.isLeader && <Crown className="h-3.5 w-3.5 shrink-0 text-bar" aria-label={t('schedule.leader')} />}
          </a>
          <DeptTag dept={r.a.dept} />
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums">
            {done}/{items.length}
          </div>
          <PhaseBadge phase={phase} complete={complete} />
        </div>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-[13px] text-muted">{t('report.noChecklist')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((i) => {
            const late = !i.tick && phase === 'over'
            return (
              <li key={i.id} className={cx('flex items-start gap-3 px-4 py-2.5', late && 'bg-bark-50/70')}>
                <button
                  disabled={!canTick || phase === 'upcoming'}
                  onClick={() => onTick(i.id, !i.tick)}
                  role="checkbox"
                  aria-checked={!!i.tick}
                  aria-label={i.title}
                  className={cx(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors disabled:cursor-default',
                    i.tick ? 'border-forest bg-forest text-white' : late ? 'border-bark/60 bg-white' : 'border-sage-dark bg-white',
                  )}
                >
                  {i.tick && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={cx('text-sm', i.tick ? 'text-ink' : late ? 'font-medium text-bark' : 'text-ink')}>
                    {i.title}
                    {i.extra && <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-muted">{t('report.extraTask')}</span>}
                  </div>
                  {i.detail && <div className="text-xs text-muted">{i.detail}</div>}
                </div>
                <div className="shrink-0 text-right text-xs">
                  {i.tick ? (
                    <span className="text-muted">
                      {i.tick.at && fmtTime(i.tick.at)}
                      {i.tick.by && <span className="block">{i.tick.byManager ? t('report.byManager', { name: i.tick.by.split(' ')[0] }) : i.tick.by.split(' ')[0]}</span>}
                    </span>
                  ) : late ? (
                    <span className="font-medium text-bark">{t('report.notDone')}</span>
                  ) : (
                    <span className="text-muted/70">{phase === 'upcoming' ? '' : t('report.open')}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}

function PhaseBadge({ phase, complete }: { phase: ShiftPhase; complete: boolean }) {
  const { t } = useT()
  if (complete) return <Badge tone="green">{t('report.complete')}</Badge>
  if (phase === 'upcoming') return <Badge>{t('report.upcoming')}</Badge>
  if (phase === 'running') return <Badge tone="warn">{t('report.running')}</Badge>
  return <Badge tone="danger">{t('report.incomplete')}</Badge>
}
