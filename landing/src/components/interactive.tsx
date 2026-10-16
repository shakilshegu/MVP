'use client'

import { useRef, useState } from 'react'
import type { Copy, Lang } from '@/content'

/** The product video in a phone frame. Nothing downloads until play is pressed. */
export function VideoPhone({ t }: { t: Copy['video'] }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  return (
    <div className="relative mx-auto w-[260px] sm:w-[290px]">
      <div className="rounded-[2.6rem] bg-ink p-2.5 shadow-[0_40px_80px_-30px_rgba(30,64,52,0.6)] ring-1 ring-black/10">
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.1rem] bg-paper">
          <video
            ref={ref}
            src={t.src}
            poster={t.poster}
            preload="none"
            playsInline
            controls={playing}
            onEnded={() => setPlaying(false)}
            className="h-full w-full object-cover"
          />
          {!playing && (
            <button
              type="button"
              onClick={() => {
                setPlaying(true)
                ref.current?.play().catch(() => setPlaying(false))
              }}
              className="group absolute inset-0 flex items-center justify-center bg-forest/10 transition-colors hover:bg-forest/20"
              aria-label={t.play}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-forest shadow-xl transition-transform group-hover:scale-105">
                <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" aria-hidden>
                  <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Planning time today, in money, next to the price of Rota. */
export function SavingsCalc({ t, lang, price }: { t: Copy['calc']; lang: Lang; price: number }) {
  const [hours, setHours] = useState(4)
  const [rate, setRate] = useState(22)
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  const monthly = Math.round(hours * rate * 4.33)
  const half = Math.round(monthly / 2)
  const max = Math.max(monthly, price)
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-6 sm:p-8">
      <h3 className="font-serif text-3xl leading-tight text-forest">{t.title}</h3>
      <p className="mt-2 text-[15px] text-ink/70">{t.lead}</p>

      <Slider label={t.hours} value={hours} min={1} max={12} step={0.5} display={`${hours.toLocaleString(lang)} ${t.hoursUnit}`} onChange={setHours} />
      <Slider label={t.rate} value={rate} min={12} max={45} step={1} display={fmt(rate)} onChange={setRate} />

      <div className="mt-8 space-y-3">
        <Bar label={t.today} value={`${fmt(monthly)} ${t.perMonth}`} width={monthly / max} tone="bg-bark/70" />
        <Bar label={t.rota} value={`${fmt(price)} ${t.perMonth}`} width={price / max} tone="bg-forest" />
      </div>
      <p className="mt-5 text-[15px] leading-relaxed text-ink/80">{t.ifHalf.replace('{amount}', fmt(half))}</p>
    </div>
  )
}

function Slider({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }) {
  return (
    <label className="mt-6 block">
      <span className="flex items-baseline justify-between gap-4 text-[15px]">
        <span className="text-ink/80">{label}</span>
        <span className="font-semibold tabular-nums text-forest">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-3 w-full"
        style={{ ['--fill' as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
    </label>
  )
}

function Bar({ label, value, width, tone }: { label: string; value: string; width: number; tone: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink/70">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-forest-50">
        <div className={`h-full rounded-full transition-[width] duration-300 ease-out ${tone}`} style={{ width: `${Math.max(3, width * 100)}%` }} />
      </div>
    </div>
  )
}
