'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** Runs `onShow` once when the element scrolls into view. */
function useInView<T extends Element>(threshold = 0.2, rootMargin = '0px 0px -10% 0px') {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) return setShown(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, rootMargin])
  return { ref, shown }
}

/** Fades and slides content in the first time it is scrolled into view. */
export function Reveal({ children, delay = 0, variant = 'up', className = '' }: { children: ReactNode; delay?: number; variant?: 'up' | 'image'; className?: string }) {
  const { ref, shown } = useInView<HTMLDivElement>()
  return (
    <div ref={ref} className={`reveal reveal-${variant} ${shown ? 'is-shown' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/** A rule with a checkmark that draws itself when it comes into view, as if Rota just checked it. */
export function CheckedRule({ title, body, delay }: { title: string; body: string; delay: number }) {
  const { ref, shown } = useInView<HTMLDivElement>(0.4)
  return (
    <div ref={ref} className={`checked ${shown ? 'is-shown' : ''} flex gap-4 border-t border-white/20 pt-4`} style={{ ['--d' as string]: `${delay}ms` }}>
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/25">
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
          <path d="M5 10.5l3.2 3.2L15 6.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
        </svg>
      </span>
      <div>
        <dt className="font-serif text-2xl">{title}</dt>
        <dd className="mt-1 text-[15px] leading-relaxed text-white/70">{body}</dd>
      </div>
    </div>
  )
}

/** The dotted leader on the price card, drawn across when the card comes into view. */
export function Leader() {
  const { ref, shown } = useInView<HTMLSpanElement>(0.6)
  return <span ref={ref} aria-hidden className={`leader mb-2 flex-1 ${shown ? 'is-shown' : ''}`} />
}

/**
 * The restaurant week: a line down the day column fills as you scroll, and the day you're
 * reading lights up.
 */
export function WeekRail({ children, count }: { children: ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const mid = window.innerHeight * 0.55
      const p = Math.min(1, Math.max(0, (mid - r.top) / r.height))
      setProgress(p)
      const items = [...el.querySelectorAll<HTMLElement>('[data-day]')]
      items.forEach((it) => it.toggleAttribute('data-reached', it.getBoundingClientRect().top < mid))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [count])
  return (
    <div ref={ref} className="relative">
      <div aria-hidden className="absolute bottom-0 left-[1.4rem] top-2 hidden w-px bg-sage-dark lg:block">
        <div className="h-full w-full origin-top bg-brass" style={{ transform: `scaleY(${progress})` }} />
      </div>
      <ol className="space-y-20 lg:space-y-28">{children}</ol>
    </div>
  )
}

/** Day marker on the rail; brightens once you've scrolled to it. */
export function DayMark({ index, label }: { index: number; label: string }) {
  return (
    <div className="day-mark relative font-serif text-5xl leading-none lg:pl-12 lg:text-6xl" data-index={index} aria-hidden>
      <span className="absolute left-[1.05rem] top-3 hidden h-3 w-3 rounded-full border-2 border-sage-dark bg-paper transition-colors duration-300 lg:block" />
      {label}
    </div>
  )
}

/** Sticky header: gains a soft shadow once you scroll, and underlines the section you are in. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('header a[data-section]')]
    const sections = links.map((l) => document.getElementById(l.dataset.section!)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          links.forEach((l) => l.toggleAttribute('data-current', l.dataset.section === e.target.id))
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])
  return (
    <header className={`sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300 ${scrolled ? 'border-sage-dark/60 bg-sage/90 shadow-[0_8px_30px_-18px_rgba(30,64,52,0.45)] backdrop-blur-md' : 'border-transparent bg-sage/0'}`}>
      {children}
    </header>
  )
}

/** Phones: once the hero is out of sight, keep the price and the demo button within reach. */
export function MobileCta({ price, per, label, href, external }: { price: string; per: string; label: string; href: string; external: boolean }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const hero = document.getElementById('hero')
    const end = document.getElementById('final')
    if (!hero) return
    const seen = { hero: true, end: false }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) seen.hero = e.isIntersecting
        if (e.target === end) seen.end = e.isIntersecting
      }
      setShow(!seen.hero && !seen.end)
    })
    io.observe(hero)
    if (end) io.observe(end)
    return () => io.disconnect()
  }, [])
  return (
    <div
      className={`fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-2xl bg-forest py-2.5 pl-4 pr-2.5 text-white shadow-[0_18px_40px_-14px_rgba(30,64,52,0.7)] transition-all duration-300 sm:hidden ${show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}
      aria-hidden={!show}
    >
      <span className="text-sm">
        <span className="font-serif text-xl">{price}</span>
        <span className="text-white/70"> {per}</span>
      </span>
      <a href={href} tabIndex={show ? 0 : -1} {...(external && { target: '_blank', rel: 'noopener' })} className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-forest">
        {label}
      </a>
    </div>
  )
}
