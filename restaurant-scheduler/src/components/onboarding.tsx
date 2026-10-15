import { useState } from 'react'
import { Check, ChevronRight, Rocket, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { useT } from '../i18n'
import { cx, IconButton } from './ui'

/** First steps for a new branch, shown on Today until done or dismissed. */
export function GetStarted() {
  const { s, branch } = useStore()
  const { t } = useT()
  const key = `rota-onboarding-hidden-${branch!.id}`
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  })
  const mine = s.assignments.filter((a) => a.branchId === branch!.id)
  const steps = [
    { id: 'details', done: !!branch!.address.trim(), to: '/settings' },
    { id: 'shifts', done: s.history.some((h) => h.branchId === branch!.id && (h.action === 'shiftEdited' || h.action === 'shiftCreated')) || mine.length > 0, to: '/templates' },
    { id: 'team', done: s.employees.some((e) => e.branchId === branch!.id), to: '/team?add=1' },
    { id: 'plan', done: mine.length > 0, to: '/schedule' },
    { id: 'publish', done: mine.some((a) => a.state === 'published'), to: '/review' },
  ] as const
  const done = steps.filter((x) => x.done).length
  if (hidden || done === steps.length) return null
  const next = steps.find((x) => !x.done)!

  return (
    <section className="panel mb-6 overflow-hidden">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest">
          <Rocket className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{t('onboarding.title', { branch: branch!.name })}</h2>
          <p className="text-[13px] text-muted">{t('onboarding.progress', { done, total: steps.length })}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-forest origin-left animate-grow-x transition-[width] duration-300" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
        </div>
        <IconButton
          label={t('onboarding.hide')}
          onClick={() => {
            setHidden(true)
            try {
              localStorage.setItem(key, '1')
            } catch {
              /* remembered for this visit only */
            }
          }}
        >
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      <ol className="divide-y divide-line">
        {steps.map((x, i) => (
          <li key={x.id}>
            <a href={`#${x.to}`} className={cx('flex items-center gap-3 px-5 py-3 hover:bg-paper', x === next && 'bg-forest-50/50')}>
              <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold', x.done ? 'bg-forest text-white' : 'bg-paper text-muted ring-1 ring-line')}>
                {x.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('block text-sm font-medium', x.done && 'text-muted line-through')}>{t(`onboarding.steps.${x.id}.title`)}</span>
                {!x.done && <span className="block text-xs text-muted">{t(`onboarding.steps.${x.id}.body`)}</span>}
              </span>
              {x === next && <ChevronRight className="h-4 w-4 text-forest" aria-hidden />}
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}
