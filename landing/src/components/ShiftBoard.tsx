'use client'

import { useEffect, useState } from 'react'
import type { Copy } from '@/content'

type Tone = 'morning' | 'evening' | 'night'
const TONES: Tone[] = ['morning', 'evening', 'night']
const toneCls: Record<Tone, string> = {
  morning: 'bg-morning text-[#654a08]',
  evening: 'bg-evening text-bark',
  night: 'bg-night text-[#2c3457]',
}

// One week at a restaurant: [shift][day]. Names in the second list are the gaps the board fills.
const START: (string | null)[][] = [
  ['Lina', 'Ana', null, 'Sofia', 'Ana', null, 'Mei'],
  ['Jonah', null, 'Kwame', 'Kwame', null, 'Lina', null],
  ['Tom', 'Lukas', 'Lukas', null, 'Aisha', null, 'Dario'],
]
const FILLS: [number, number, string][] = [
  [0, 2, 'Sofia'],
  [1, 1, 'Jonas'],
  [2, 3, 'Tom'],
  [1, 4, 'Ana'],
  [0, 5, 'Sofia'],
  [2, 5, 'Mira'],
  [1, 6, 'Lina'],
]
// Phones show Thursday to Sunday, the busy end of the week, so names stay readable.
const FIRST_PHONE_DAY = 3
// Shift leaders get the strong highlight, as in the app.
const LEADERS = new Set(['0-0', '0-1', '0-3', '1-2', '1-5', '2-6'])

export function ShiftBoard({ t }: { t: Copy['hero']['board'] }) {
  const [step, setStep] = useState(0)
  const total = START.flat().length
  const filled = START.flat().filter(Boolean).length + step
  const done = step === FILLS.length

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(FILLS.length)
      return
    }
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      i += 1
      setStep(i)
      if (i < FILLS.length) timer = setTimeout(tick, 420)
    }
    timer = setTimeout(tick, 900)
    return () => clearTimeout(timer)
  }, [])

  const cell = (s: number, d: number) => {
    const fill = FILLS.findIndex(([fs, fd]) => fs === s && fd === d)
    if (START[s][d]) return { name: START[s][d] as string, isNew: false }
    if (fill >= 0 && fill < step) return { name: FILLS[fill][2], isNew: true }
    return null
  }

  return (
    <figure aria-label={`${t.title}, ${t.week}`}>
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-28px_rgba(30,64,52,0.45)]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div>
            <div className="font-serif text-xl leading-tight text-forest sm:text-2xl">{t.title}</div>
            <div className="text-xs text-muted">{t.week}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums" aria-live="polite">
              {filled}/{total} <span className="font-normal text-muted">{t.covered}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-forest-50 sm:w-36">
              <div className="h-full rounded-full bg-forest transition-[width] duration-300" style={{ width: `${(filled / total) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[5.25rem_repeat(4,minmax(0,1fr))] gap-px bg-line text-xs sm:grid-cols-[5.5rem_repeat(7,minmax(0,1fr))]">
          <div className="bg-paper" />
          {t.days.map((d, i) => (
            <div key={d} className={`${i < FIRST_PHONE_DAY ? 'hidden sm:block' : ''} bg-paper px-1 py-2 text-center font-medium text-muted`}>
              {d}
            </div>
          ))}
          {TONES.map((tone, s) => (
            <Row key={tone} label={t.shifts[s]} tone={tone}>
              {t.days.map((_, d) => {
                const c = cell(s, d)
                const lead = c && LEADERS.has(`${s}-${d}`)
                return (
                  <div key={d} className={`${d < FIRST_PHONE_DAY ? 'hidden sm:flex' : 'flex'} min-h-12 items-center bg-white p-1.5 sm:min-h-14`}>
                    {c ? (
                      <span
                        className={`block w-full truncate rounded-md px-1.5 py-1.5 font-medium sm:px-2 ${lead ? 'bg-forest text-white' : toneCls[tone]} ${c.isNew ? 'animate-fill ring-2 ring-forest/30' : ''}`}
                      >
                        {c.name}
                      </span>
                    ) : (
                      <span className="block w-full rounded-md border border-dashed border-sage-dark px-1 py-1.5 text-center text-muted">{t.open}</span>
                    )}
                  </div>
                )
              })}
            </Row>
          ))}
        </div>
      </div>
      <figcaption
        className={`mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-300 ${done ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
          <path d="M5 10.5l3.2 3.2L15 6.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t.published}
      </figcaption>
    </figure>
  )
}

function Row({ label, tone, children }: { label: string; tone: Tone; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-1.5 bg-white px-2 sm:px-3">
        <span className={`h-6 w-1 shrink-0 rounded-full ${toneCls[tone].split(' ')[0]}`} aria-hidden />
        <span className="truncate font-medium">{label}</span>
      </div>
      {children}
    </>
  )
}
