import { Droplets } from 'lucide-react'
import { shiftWeather, weatherKind } from '../lib/weather'
import type { DayWeather, SpanWeather } from '../lib/weather'
import { useStore } from '../lib/store'
import { fmtDay, toMin } from '../lib/date'
import { useT } from '../i18n'
import type { T } from '../i18n/format'
import { cx, Popover, toneCls } from './ui'

const describeDay = (t: T, w: DayWeather) => t('weather.describe', { label: t(`weather.${weatherKind(w.code).key}`), max: w.max, min: w.min, rain: w.rain })

/** Weather line under a day in the schedule header; clicking it shows the forecast per shift. */
export function DayWeatherLine({ w, status, onOpen }: { w?: DayWeather; status: string; onOpen?: (el: HTMLElement) => void }) {
  const { t } = useT()
  if (status === 'loading') return <div className="mt-2 h-5 w-16 animate-pulse rounded bg-paper" aria-hidden />
  if (!w) {
    return (
      <div className="mt-2 h-5 text-[13px] text-muted/50" title={status === 'error' ? t('weather.unavailable') : t('weather.noForecast')}>
        –
      </div>
    )
  }
  if (onOpen && w.hours) {
    return (
      <button
        onClick={(e) => onOpen(e.currentTarget)}
        aria-label={`${describeDay(t, w)}. ${t('weather.byShift')}`}
        title={t('weather.byShift')}
        className="-mx-1 mt-1.5 flex h-6 w-[calc(100%+8px)] items-center gap-1.5 rounded-md px-1 text-[13px] hover:bg-paper"
      >
        <DayWeatherInner w={w} />
      </button>
    )
  }
  return (
    <div role="img" aria-label={describeDay(t, w)} title={describeDay(t, w)} className="mt-2 flex h-5 items-center gap-1.5 text-[13px]">
      <DayWeatherInner w={w} />
    </div>
  )
}

/** Compact version for the phone day picker. */
export function DayWeatherMini({ w }: { w?: DayWeather }) {
  const { t } = useT()
  if (!w) return <span className="mt-1 h-4 text-[11px] opacity-50">–</span>
  const { Icon } = weatherKind(w.code)
  return (
    <span className="mt-1 flex items-center gap-0.5 text-[11px]" title={describeDay(t, w)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {w.max}°
    </span>
  )
}

function DayWeatherInner({ w }: { w: DayWeather }) {
  const { Icon, tint } = weatherKind(w.code)
  return (
    <>
      <Icon className={cx('h-4 w-4 shrink-0', tint)} aria-hidden />
      <span className="font-medium text-ink">{w.max}°</span>
      <span className="text-muted">{w.min}°</span>
      {w.rain >= 40 && (
        <span className="ml-auto flex items-center gap-0.5 text-xs font-medium text-rain">
          <Droplets className="h-3 w-3" aria-hidden />
          {w.rain}%
        </span>
      )}
    </>
  )
}

const describeSpan = (t: T, w: SpanWeather) =>
  t('weather.describeShift', { label: t(`weather.${weatherKind(w.code).key}`), temp: w.min === w.max ? `${w.max}` : `${w.min}–${w.max}`, rain: w.rain })

/** Weather during one shift: icon, temperature range and rain chance when it matters (CR-10). */
export function ShiftWeatherTag({ w, className }: { w?: SpanWeather; className?: string }) {
  const { t } = useT()
  if (!w) return null
  const { Icon, tint } = weatherKind(w.code)
  return (
    <span role="img" aria-label={describeSpan(t, w)} title={describeSpan(t, w)} className={cx('inline-flex items-center gap-1 text-[13px]', className)}>
      <Icon className={cx('h-4 w-4 shrink-0', tint)} aria-hidden />
      <span className="font-medium text-ink">{w.min === w.max ? `${w.max}°` : `${w.min}–${w.max}°`}</span>
      {w.rain >= 30 && (
        <span className="flex items-center gap-0.5 text-xs font-medium text-rain">
          <Droplets className="h-3 w-3" aria-hidden />
          {w.rain}%
        </span>
      )}
    </span>
  )
}

/** Popover listing the forecast for each of the company's shifts on a day. */
export function ShiftWeatherPopover({ date, data, city, anchor, onClose }: { date: string; data: Record<string, DayWeather>; city: string; anchor: DOMRect; onClose: () => void }) {
  const { s } = useStore()
  const { t } = useT()
  const shifts = [...s.templates].sort((a, b) => toMin(a.start) - toMin(b.start))
  return (
    <Popover anchor={anchor} onClose={onClose} width={300}>
      <div className="border-b border-line px-4 py-3">
        <div className="text-sm font-semibold">{t('weather.byShift')}</div>
        <div className="text-xs text-muted">
          {fmtDay(date)} · {city}
        </div>
      </div>
      <ul className="divide-y divide-line">
        {shifts.map((tpl) => {
          const w = shiftWeather(data, date, tpl.start, tpl.end)
          return (
            <li key={tpl.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={cx('w-1 self-stretch rounded-full', toneCls[tpl.tone].split(' ')[0])} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{tpl.name}</div>
                <div className="text-xs text-muted">
                  {tpl.start}–{tpl.end}
                  {w && ` · ${t(`weather.${weatherKind(w.code).key}`)}`}
                </div>
              </div>
              {w ? <ShiftWeatherTag w={w} /> : <span className="text-xs text-muted">–</span>}
            </li>
          )
        })}
      </ul>
    </Popover>
  )
}
