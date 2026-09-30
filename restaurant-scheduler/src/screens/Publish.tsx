import { useState } from 'react'
import { AlertTriangle, ArrowRight, ClipboardList, Bell, CalendarCheck2, Check, Hourglass, Undo2, WifiOff } from 'lucide-react'
import { branchChanges, useStore } from '../lib/store'
import { useT } from '../i18n'
import { conflictTitles, describeSlot } from '../i18n/format'
import type { Change } from '../lib/store'
import type { Task } from '../lib/types'
import { navigate, useOnline } from '../lib/hooks'
import { fmtLong, relTime } from '../lib/date'
import { Avatar, Badge, Button, cx, EmptyState, PageHeader } from '../components/ui'

const STEPS = ['draft', 'review', 'approve', 'publish'] as const

export function ReviewPublish() {
  const { s, a, branch, can, me, toast } = useStore()
  const { t } = useT()
  const online = useOnline()
  const [confirmed, setConfirmed] = useState(false)
  const changes = branchChanges(s, branch!.id)
  const waiting = s.pendingApproval[branch!.id]
  const canPublish = can('publish')
  const notifyIds = [...new Set(changes.flatMap((c) => (c.kind === 'moved' ? [c.a.employeeId, c.from.employeeId] : [c.a.employeeId])))]
  const overrides = changes.filter((c) => c.kind !== 'tasks' && c.a.overridden).length
  const taskChanges = changes.filter((c) => c.kind === 'tasks').length
  const step = confirmed ? 3 : 1

  const byDate = changes.reduce<Record<string, Change[]>>((m, c) => {
    ;(m[c.a.date] ??= []).push(c)
    return m
  }, {})

  if (changes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t('publish.title')} />
        <div className="panel">
          <EmptyState
            icon={<CalendarCheck2 className="h-5 w-5" />}
            title={t('publish.emptyTitle')}
            body={t('publish.emptyBody')}
            action={<Button variant="primary" onClick={() => navigate('/schedule')}>{t('publish.goToSchedule')}</Button>}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('publish.title')} sub={t('publish.sub', { branch: branch!.name })} />

      <ol className="mb-6 flex items-center gap-2 overflow-x-auto text-[13px]" aria-label={t('publish.stepsLabel')}>
        {STEPS.map((label, i) => (
          <li key={label} className="flex shrink-0 items-center gap-2">
            <span
              aria-current={i === step ? 'step' : undefined}
              className={cx(
                'flex items-center gap-2 rounded-full py-1 pl-1 pr-3',
                i < step ? 'text-forest' : i === step ? 'bg-white font-medium text-ink ring-1 ring-line' : 'text-muted',
              )}
            >
              <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold', i < step ? 'bg-forest text-white' : i === step ? 'bg-ink text-white' : 'bg-sage-dark text-white')}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {t(`publish.steps.${label}`)}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-sage-dark" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, list]) => (
            <section key={date} className="panel overflow-hidden">
              <h2 className="border-b border-line bg-paper px-5 py-2.5 text-sm font-semibold">{fmtLong(date)}</h2>
              <ul>
                {list.map((c) => {
                  const e = s.employees.find((x) => x.id === c.a.employeeId)!
                  return (
                    <li key={c.a.id} className="flex items-start gap-3 border-b border-line px-5 py-3.5 last:border-0">
                      <Avatar e={e} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{e.name}</span>
                          {c.kind === 'added' && <Badge tone="green">{t('publish.added')}</Badge>}
                          {c.kind === 'removed' && <Badge tone="danger">{t('publish.removed')}</Badge>}
                          {c.kind === 'moved' && <Badge tone="dark">{t('publish.moved')}</Badge>}
                          {c.kind === 'tasks' && (
                            <Badge tone="neutral">
                              <ClipboardList className="h-3 w-3" /> {t('publish.tasks')}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-[13px] text-muted">
                          {c.kind === 'moved' ? (
                            <>
                              <span className="line-through">{describeSlot(t, s, c.from)}</span>
                              <ArrowRight className="mx-1.5 inline h-3 w-3" />
                              <span className="text-ink">{describeSlot(t, s, c.a)}</span>
                            </>
                          ) : (
                            <span className={c.kind === 'removed' ? 'line-through' : ''}>{describeSlot(t, s, c.a)}</span>
                          )}
                        </div>
                        {c.kind === 'tasks' ? (
                          <TaskLines added={c.added} removed={c.removed} />
                        ) : (
                          c.kind !== 'removed' && !!c.a.tasks?.length && <TaskLines added={c.a.tasks} removed={[]} />
                        )}
                        {c.kind !== 'tasks' && c.a.overridden && (
                          <div className="mt-1 flex items-center gap-1.5 text-[13px] text-warn">
                            <AlertTriangle className="h-3.5 w-3.5" /> {t('schedule.despite', { list: conflictTitles(t, c.a.overridden) })}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => (c.kind === 'tasks' ? a.revertTasks(c.a.id) : c.kind === 'removed' ? a.undoRemove(c.a.id) : a.remove(c.a.id))} aria-label={t('publish.undoFor', { name: e.name })}>
                        <Undo2 className="h-3.5 w-3.5" /> {t('common.undo')}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="panel p-5">
            <dl className={cx('grid gap-2 text-center', taskChanges ? 'grid-cols-4' : 'grid-cols-3')}>
              {[
                [t('publish.added'), changes.filter((c) => c.kind === 'added').length] as const,
                [t('publish.moved'), changes.filter((c) => c.kind === 'moved').length] as const,
                [t('publish.removed'), changes.filter((c) => c.kind === 'removed').length] as const,
                ...(taskChanges ? [[t('publish.tasks'), taskChanges] as const] : []),
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-paper py-3">
                  <dd className="text-xl font-semibold">{v}</dd>
                  <dt className="text-xs text-muted">{k}</dt>
                </div>
              ))}
            </dl>

            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bell className="h-4 w-4 text-forest" /> {t('schedule.willNotify', { count: notifyIds.length })}
              </div>
              <p className="mt-1 text-[13px] text-muted">{t('publish.onlyChanged')}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {notifyIds.map((id) => {
                  const e = s.employees.find((x) => x.id === id)!
                  return (
                    <span key={id} title={e.name}>
                      <Avatar e={e} size={28} />
                    </span>
                  )
                })}
              </div>
            </div>

            {overrides > 0 && (
              <div className="mt-4 flex gap-2 rounded-xl bg-warn-50 p-3 text-[13px] text-warn">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {t('publish.overrides', { count: overrides })}
              </div>
            )}

            <div className="mt-5 border-t border-line pt-5">
              {!online && (
                <p className="mb-3 flex items-center gap-2 text-[13px] text-bark">
                  <WifiOff className="h-4 w-4" /> {t('publish.offline')}
                </p>
              )}
              {canPublish ? (
                <>
                  {waiting && <p className="mb-3 text-[13px] text-muted">{t('publish.sentByManager')}</p>}
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-forest" />
                    {t('publish.confirm')}
                  </label>
                  <Button
                    variant="primary"
                    className="mt-4 w-full"
                    disabled={!confirmed || !online}
                    onClick={() => {
                      a.publish()
                      navigate('/published')
                    }}
                  >
                    {t('publish.publishBtn')}
                  </Button>
                </>
              ) : waiting ? (
                <div className="flex gap-3 rounded-xl bg-paper p-3 text-sm">
                  <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  <div>
                    <div className="font-medium">{t('publish.waitingTitle')}</div>
                    <div className="text-[13px] text-muted">{t('publish.waitingBody')}</div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-muted">{t('publish.sendsTo', { name: me?.name.split(' ')[0] ?? '' })}</p>
                  <Button
                    variant="primary"
                    className="mt-4 w-full"
                    disabled={!online}
                    onClick={() => {
                      a.sendForApproval()
                      toast(t('publish.sent'))
                    }}
                  >
                    {t('publish.sendBtn')}
                  </Button>
                </>
              )}
              <Button variant="ghost" className="mt-2 w-full" onClick={() => navigate('/schedule')}>
                {t('common.backToSchedule')}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export function Published() {
  const { s } = useStore()
  const { t } = useT()
  const p = s.lastPublish
  if (!p) {
    navigate('/schedule')
    return null
  }
  const people = p.notified.map((id) => s.employees.find((e) => e.id === id)).filter((e) => !!e)
  return (
    <div className="mx-auto mt-6 max-w-lg">
      <div className="panel px-8 py-10 text-center">
        <svg viewBox="0 0 56 56" className="mx-auto h-16 w-16" aria-hidden>
          <circle cx="28" cy="28" r="27" className="fill-forest" />
          <path d="M17 29l7 7 15-16" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="48" className="animate-draw" />
        </svg>
        <h1 className="mt-5 font-serif text-4xl text-forest">{t('publish.doneTitle')}</h1>
        <p className="mt-2 text-sm text-muted">
          {t('publish.live', { count: p.count })} · {relTime(p.at)}
        </p>
        <div className="mt-6 rounded-xl bg-paper p-4 text-left">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-forest" />
            {t('publish.notified', { count: people.length })}
          </div>
          <ul className="mt-3 space-y-2">
            {people.map((e) => (
              <li key={e.id} className="flex items-center gap-2.5 text-sm">
                <Avatar e={e} size={26} />
                {e.name}
                <span className="ml-auto text-xs text-muted">{e.email}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={() => navigate('/schedule')}>
            {t('common.backToSchedule')}
          </Button>
          <Button onClick={() => navigate('/history')}>{t('publish.viewHistory')}</Button>
        </div>
      </div>
    </div>
  )
}

function TaskLines({ added, removed }: { added: Task[]; removed: Task[] }) {
  const { t } = useT()
  return (
    <ul className="mt-1.5 space-y-0.5 text-[13px]">
      {added.map((task) => (
        <li key={task.id} className="flex items-center gap-1.5 text-forest">
          <span className="w-3 text-center font-semibold" aria-label={t('publish.addedTask')}>+</span>
          {task.text}
        </li>
      ))}
      {removed.map((task) => (
        <li key={task.id} className="flex items-center gap-1.5 text-bark">
          <span className="w-3 text-center font-semibold" aria-label={t('publish.removedTask')}>−</span>
          <span className="line-through">{task.text}</span>
        </li>
      ))}
    </ul>
  )
}
