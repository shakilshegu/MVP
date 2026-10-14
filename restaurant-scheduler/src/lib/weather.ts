import { useEffect, useState } from 'react'
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react'
import { addDays, todayKey } from './date'

/** `name` is the stored key; `de` is the German spelling where it differs. */
export type City = { name: string; de?: string; country: 'DE' | 'IN'; lat: number; lon: number }

/** Restaurant locations for the forecast, set once per branch in Settings (CR-10). */
export const CITIES: City[] = [
  { name: 'Berlin', country: 'DE', lat: 52.52, lon: 13.405 },
  { name: 'Hamburg', country: 'DE', lat: 53.551, lon: 9.994 },
  { name: 'Munich', de: 'München', country: 'DE', lat: 48.137, lon: 11.575 },
  { name: 'Cologne', de: 'Köln', country: 'DE', lat: 50.938, lon: 6.96 },
  { name: 'Frankfurt', country: 'DE', lat: 50.11, lon: 8.682 },
  { name: 'Stuttgart', country: 'DE', lat: 48.776, lon: 9.183 },
  { name: 'Düsseldorf', country: 'DE', lat: 51.227, lon: 6.774 },
  { name: 'Leipzig', country: 'DE', lat: 51.34, lon: 12.375 },
  { name: 'Dresden', country: 'DE', lat: 51.05, lon: 13.738 },
  { name: 'Hanover', de: 'Hannover', country: 'DE', lat: 52.375, lon: 9.732 },
  { name: 'Nuremberg', de: 'Nürnberg', country: 'DE', lat: 49.452, lon: 11.077 },
  { name: 'Bremen', country: 'DE', lat: 53.079, lon: 8.802 },
  { name: 'Kochi', country: 'IN', lat: 9.931, lon: 76.267 },
  { name: 'Thiruvananthapuram', country: 'IN', lat: 8.524, lon: 76.936 },
  { name: 'Kozhikode', country: 'IN', lat: 11.258, lon: 75.78 },
  { name: 'Thrissur', country: 'IN', lat: 10.527, lon: 76.214 },
  { name: 'Kannur', country: 'IN', lat: 11.874, lon: 75.37 },
  { name: 'Alappuzha', country: 'IN', lat: 9.498, lon: 76.339 },
  { name: 'Kollam', country: 'IN', lat: 8.893, lon: 76.614 },
  { name: 'Munnar', country: 'IN', lat: 10.089, lon: 77.06 },
  { name: 'Bengaluru', country: 'IN', lat: 12.972, lon: 77.594 },
  { name: 'Chennai', country: 'IN', lat: 13.083, lon: 80.271 },
  { name: 'Mumbai', country: 'IN', lat: 19.076, lon: 72.878 },
  { name: 'Delhi', country: 'IN', lat: 28.614, lon: 77.209 },
]

export type HourWeather = { code: number; temp: number; rain: number }
/** `hours` holds 24 hourly values, 00:00–23:00 local time. */
export type DayWeather = { code: number; max: number; min: number; rain: number; hours?: HourWeather[] }
export type SpanWeather = { code: number; min: number; max: number; rain: number }

type Kind = { key: 'clear' | 'partlyCloudy' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'; Icon: typeof Sun; tint: string }

/** WMO weather interpretation codes, as returned by Open-Meteo. */
export function weatherKind(code: number): Kind {
  if (code === 0) return { key: 'clear', Icon: Sun, tint: 'text-bar' }
  if (code <= 2) return { key: 'partlyCloudy', Icon: CloudSun, tint: 'text-bar' }
  if (code === 3) return { key: 'overcast', Icon: Cloud, tint: 'text-muted' }
  if (code <= 48) return { key: 'fog', Icon: CloudFog, tint: 'text-muted' }
  if (code <= 57) return { key: 'drizzle', Icon: CloudDrizzle, tint: 'text-rain' }
  if (code <= 67 || (code >= 80 && code <= 82)) return { key: 'rain', Icon: CloudRain, tint: 'text-rain' }
  if (code <= 77 || code === 85 || code === 86) return { key: 'snow', Icon: CloudSnow, tint: 'text-night-ink' }
  return { key: 'thunder', Icon: CloudLightning, tint: 'text-bark' }
}

// Open-Meteo serves about 3 months back and 16 days ahead.
const PAST_LIMIT = 60
const FUTURE_LIMIT = 15

const cache = new Map<string, Promise<Record<string, DayWeather>>>()

function fetchRange(city: City, from: string, to: string) {
  const key = `${city.lat},${city.lon},${from},${to}`
  let p = cache.get(key)
  if (!p) {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&hourly=weather_code,temperature_2m,precipitation_probability` +
      `&timezone=auto&start_date=${from}&end_date=${to}`
    p = fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        const d = j.daily
        const out: Record<string, DayWeather> = {}
        const h = j.hourly
        d.time.forEach((t: string, i: number) => {
          if (d.temperature_2m_max[i] == null) return
          const hours: HourWeather[] = []
          for (let k = i * 24; k < i * 24 + 24 && h; k++) {
            if (h.temperature_2m[k] == null) break
            hours.push({ code: h.weather_code[k], temp: Math.round(h.temperature_2m[k]), rain: h.precipitation_probability[k] ?? 0 })
          }
          out[t] = {
            code: d.weather_code[i],
            max: Math.round(d.temperature_2m_max[i]),
            min: Math.round(d.temperature_2m_min[i]),
            rain: d.precipitation_probability_max[i] ?? 0,
            hours: hours.length === 24 ? hours : undefined,
          }
        })
        return out
      })
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}

export function useWeather(city: City | undefined, days: string[]) {
  const [data, setData] = useState<Record<string, DayWeather>>({})
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'none'>('loading')
  const today = todayKey()
  const from = [days[0], addDays(today, -PAST_LIMIT)].sort()[1]
  const to = [days[days.length - 1], addDays(today, FUTURE_LIMIT)].sort()[0]
  const cityKey = city ? `${city.lat},${city.lon}` : ''

  useEffect(() => {
    if (!city || from > to) {
      setStatus('none')
      setData({})
      return
    }
    let live = true
    setStatus('loading')
    fetchRange(city, from, to)
      .then((d) => {
        if (!live) return
        setData(d)
        setStatus('ready')
      })
      .catch(() => live && setStatus('error'))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityKey, from, to])

  return { data, status }
}

/**
 * Weather across a shift's hours (CR-10): temperature range, the roughest conditions and the highest
 * chance of rain. Shifts past midnight continue into the next day's hours.
 */
export function shiftWeather(data: Record<string, DayWeather>, date: string, start: string, end: string): SpanWeather | undefined {
  const from = Number(start.slice(0, 2))
  let to = Number(end.slice(0, 2)) + (Number(end.slice(3, 5)) > 0 ? 1 : 0)
  if (to <= from) to += 24
  const slice: HourWeather[] = []
  for (let hr = from; hr < to; hr++) {
    const day = data[hr < 24 ? date : addDays(date, 1)]
    const w = day?.hours?.[hr % 24]
    if (w) slice.push(w)
  }
  if (!slice.length) return undefined
  return {
    code: Math.max(...slice.map((w) => w.code)),
    min: Math.min(...slice.map((w) => w.temp)),
    max: Math.max(...slice.map((w) => w.temp)),
    rain: Math.max(...slice.map((w) => w.rain)),
  }
}

export const cityOf = (name: string | undefined) => CITIES.find((c) => c.name === name)

export const cityLabel = (name: string, locale: string) => {
  const c = cityOf(name)
  return (locale === 'de' && c?.de) || name
}
