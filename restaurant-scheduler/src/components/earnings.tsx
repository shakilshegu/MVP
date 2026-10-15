import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { doneCount, shiftItems } from '../lib/report'
import { useStore } from '../lib/store'
import { addDays, fmtDay, fmtMonthYear, fmtShort, startOfWeek, todayKey } from '../lib/date'
import { sum, workedShifts } from '../lib/earnings'
import type { Worked } from '../lib/earnings'
import type { Employee } from '../lib/types'
import { useT } from '../i18n'
import { money } from '../i18n/format'
import { cx, DeptTag, toneCls } from './ui'

const PAGE = 12

/** Profile section: gross earnings per week and month, and every shift already worked (CR-08). */
export function EarningsHistory({ e }: { e: Employee }) {
  const { s, canSeePay, company } = useStore()
  const { t } = useT()
  const [all, setAll] = useState(false)
  const cur = company?.currency ?? 'EUR'
  const worked = workedShifts(s, e)
  const today = todayKey()
  const ws = startOfWeek(today)
  const month = today.slice(0, 7)
  const lastMonth = addDays(`${month}-01`, -1).slice(0, 7)
  const tiles = [
    { label: t('profile.weekEarn'), ...sum(worked.filter((w) => w.a.date >= ws)) },
    { label: t('profile.monthEarn'), ...sum(worked.filter((w) => w.a.date.startsWith(month))) },
    { label: t('profile.lastMonth'), ...sum(worked.filter((w) => w.a.date.startsWith(lastMonth))) },
  ]
  const weeks = Array.from({ length: 6 }, (_, i) => addDays(ws, (i - 5) * 7)).map((start) => ({ start, ...sum(worked.filter((w) => w.a.date >= start && w.a.date <= addDays(start, 6))) }))
  const peak = Math.max(e.maxHours, ...weeks.map((w) => w.hours))

  const shown = all ? worked : worked.slice(0, PAGE)
  const byMonth = shown.reduce<Record<string, Worked[]>>((m, w) => {
    ;(m[w.a.date.slice(0, 7)] ??= []).push(w)
    return m
  }, {})

  return (
    <section className="panel">
      <div className="border-b border-line px-5 py-3.5">
        <h2 className="text-sm font-semibold">{canSeePay ? t('profile.earnings') : t('profile.historyOnly')}</h2>
        {canSeePay && <p className="mt-0.5 text-xs text-muted">{t('profile.estimate')}</p>}
      </div>

      {canSeePay && (
        <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
          {tiles.map((x) => (
            <div key={x.label} className="px-5 py-4">
              <div className="text-xs text-muted">{x.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{money(x.amount, cur)}</div>
              <div className="mt-0.5 text-xs text-muted">
                {x.hours} h · {t('common.shifts', { count: x.shifts })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-b border-line px-5 py-4">
        <div className="text-xs text-muted">{t('profile.byWeek')}</div>
        <div className="mt-3 flex h-24 items-end gap-2" role="list">
          {weeks.map((w) => (
            <div key={w.start} role="listitem" className="flex flex-1 flex-col items-center gap-1" title={`${fmtShort(w.start)}: ${w.hours} h${canSeePay ? ` · ${money(w.amount, cur)}` : ''}`}>
              <span className="text-[10px] tabular-nums text-muted">{w.hours || ''}</span>
              <div className="flex h-16 w-full items-end rounded bg-paper">
                <div className={cx('w-full rounded origin-bottom animate-grow-y transition-[height] duration-300', w.start === ws ? 'bg-forest' : 'bg-forest/35')} style={{ height: `${(w.hours / peak) * 100}%` }} />
              </div>
              <span className="text-[10px] text-muted">{fmtShort(w.start)}</span>
            </div>
          ))}
        </div>
      </div>

      {worked.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">{t('profile.noHistory')}</p>
      ) : (
        <>
          {Object.entries(byMonth).map(([m, list]) => {
            const total = sum(worked.filter((w) => w.a.date.startsWith(m)))
            return (
              <div key={m}>
                <div className="flex items-baseline justify-between bg-paper px-5 py-2 text-xs">
                  <span className="font-semibold">{fmtMonthYear(`${m}-01`)}</span>
                  <span className="text-muted">
                    {t('common.shifts', { count: total.shifts })} · {total.hours} h{canSeePay && ` · ${money(total.amount, cur)}`}
                  </span>
                </div>
                <ul className="divide-y divide-line">
                  {list.map(({ a, hours, amount }) => {
                    const tpl = s.templates.find((y) => y.id === a.templateId)!
                    const items = shiftItems(s, a)
                    const done = doneCount(items)
                    return (
                      <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
                        <span className="w-24 font-medium">{fmtDay(a.date)}</span>
                        <span className={cx('w-20 rounded-md px-2 py-0.5 text-center text-xs font-medium', toneCls[tpl.tone])}>{tpl.name}</span>
                        <span className="w-24 text-muted">
                          {tpl.start}–{tpl.end}
                        </span>
                        <DeptTag dept={a.dept} />
                        {items.length > 0 && (
                          <a
                            href={`#/report?date=${a.date}`}
                            title={t('profile.checklistDone', { done, total: items.length })}
                            className={cx('flex items-center gap-1 text-xs tabular-nums hover:underline', done < items.length ? 'text-bark' : 'text-muted')}
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                            {done}/{items.length}
                          </a>
                        )}
                        <span className="ml-auto tabular-nums text-muted">{hours} h</span>
                        {canSeePay && <span className="w-20 text-right font-medium tabular-nums">{money(amount, cur)}</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
          {worked.length > PAGE && (
            <button onClick={() => setAll(!all)} className="w-full border-t border-line py-3 text-[13px] font-medium text-forest hover:bg-paper">
              {all ? t('profile.showLess') : t('profile.showAll', { count: worked.length })}
            </button>
          )}
        </>
      )}
    </section>
  )
}
