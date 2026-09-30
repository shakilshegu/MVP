import { useEffect, useState } from 'react'
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react'
import { addDays, todayKey } from './date'

export type City = { name: string; lat: number; lon: number }

export const GERMAN_CITIES: City[] = [
  { name: 'Berlin', lat: 52.52, lon: 13.405 },
  { name: 'Hamburg', lat: 53.551, lon: 9.994 },
  { name: 'Munich', lat: 48.137, lon: 11.575 },
  { name: 'Cologne', lat: 50.938, lon: 6.96 },
  { name: 'Frankfurt', lat: 50.11, lon: 8.682 },
  { name: 'Stuttgart', lat: 48.776, lon: 9.183 },
  { name: 'Düsseldorf', lat: 51.227, lon: 6.774 },
  { name: 'Leipzig', lat: 51.34, lon: 12.375 },
  { name: 'Dresden', lat: 51.05, lon: 13.738 },
  { name: 'Hanover', lat: 52.375, lon: 9.732 },
  { name: 'Nuremberg', lat: 49.452, lon: 11.077 },
  { name: 'Bremen', lat: 53.079, lon: 8.802 },
]

export type DayWeather = { code: number; max: number; min: number; rain: number }

type Kind = { label: string; Icon: typeof Sun; tint: string }

/** WMO weather interpretation codes, as returned by Open-Meteo. */
export function weatherKind(code: number): Kind {
  if (code === 0) return { label: 'Clear', Icon: Sun, tint: 'text-bar' }
  if (code <= 2) return { label: 'Partly cloudy', Icon: CloudSun, tint: 'text-bar' }
  if (code === 3) return { label: 'Overcast', Icon: Cloud, tint: 'text-muted' }
  if (code <= 48) return { label: 'Fog', Icon: CloudFog, tint: 'text-muted' }
  if (code <= 57) return { label: 'Drizzle', Icon: CloudDrizzle, tint: 'text-rain' }
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: 'Rain', Icon: CloudRain, tint: 'text-rain' }
  if (code <= 77 || code === 85 || code === 86) return { label: 'Snow', Icon: CloudSnow, tint: 'text-night-ink' }
  return { label: 'Thunderstorm', Icon: CloudLightning, tint: 'text-bark' }
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
      `&timezone=Europe%2FBerlin&start_date=${from}&end_date=${to}`
    p = fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        const d = j.daily
        const out: Record<string, DayWeather> = {}
        d.time.forEach((t: string, i: number) => {
          if (d.temperature_2m_max[i] == null) return
          out[t] = {
            code: d.weather_code[i],
            max: Math.round(d.temperature_2m_max[i]),
            min: Math.round(d.temperature_2m_min[i]),
            rain: d.precipitation_probability_max[i] ?? 0,
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

export const cityOf = (name: string | undefined) => GERMAN_CITIES.find((c) => c.name === name)
