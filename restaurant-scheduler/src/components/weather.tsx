import { Droplets } from 'lucide-react'
import { weatherKind } from '../lib/weather'
import type { DayWeather } from '../lib/weather'
import { cx } from './ui'

const describeDay = (w: DayWeather) =>
  `${weatherKind(w.code).label} · high ${w.max}°C, low ${w.min}°C · ${w.rain}% chance of rain`

/** Weather line under a day in the schedule header. */
export function DayWeatherLine({ w, status }: { w?: DayWeather; status: string }) {
  if (status === 'loading') return <div className="mt-2 h-5 w-16 animate-pulse rounded bg-paper" aria-hidden />
  if (!w) {
    return (
      <div className="mt-2 h-5 text-[13px] text-muted/50" title={status === 'error' ? 'Weather unavailable' : 'Forecasts are available up to 16 days ahead'}>
        –
      </div>
    )
  }
  const { Icon, tint } = weatherKind(w.code)
  return (
    <div role="img" aria-label={describeDay(w)} title={describeDay(w)} className="mt-2 flex h-5 items-center gap-1.5 text-[13px]">
      <Icon className={cx('h-4 w-4 shrink-0', tint)} aria-hidden />
      <span className="font-medium text-ink">{w.max}°</span>
      <span className="text-muted">{w.min}°</span>
      {w.rain >= 40 && (
        <span className="ml-auto flex items-center gap-0.5 text-xs font-medium text-rain">
          <Droplets className="h-3 w-3" aria-hidden />
          {w.rain}%
        </span>
      )}
    </div>
  )
}

/** Compact version for the phone day picker. */
export function DayWeatherMini({ w }: { w?: DayWeather }) {
  if (!w) return <span className="mt-1 h-4 text-[11px] opacity-50">–</span>
  const { Icon } = weatherKind(w.code)
  return (
    <span className="mt-1 flex items-center gap-0.5 text-[11px]" title={describeDay(w)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {w.max}°
    </span>
  )
}
