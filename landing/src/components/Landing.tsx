import { copy, site } from '@/content'
import type { Lang } from '@/content'
import { ShiftBoard } from './ShiftBoard'
import { CheckedRule, DayMark, HeaderShell, Leader, MobileCta, Reveal, WeekRail } from './motion'

const demoHref = (subject: string) => site.appUrl || `mailto:${site.email}?subject=${encodeURIComponent(subject)}`
const talkHref = (subject: string) => `mailto:${site.email}?subject=${encodeURIComponent(subject)}`
const external = Boolean(site.appUrl)

const btn = 'btn-motion inline-flex h-12 items-center justify-center rounded-lg px-5 text-[15px] font-medium'
const primary = `${btn} bg-forest text-white hover:bg-forest-600`
const secondary = `${btn} bg-white text-forest ring-1 ring-line hover:ring-forest/40`

/** Tall, narrow screenshots (side panels) are shown smaller so they don't dominate their row. */
const NARROW = new Set(['fill-panel'])

export function Landing({ lang }: { lang: Lang }) {
  const t = copy[lang]
  const price = new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(site.price)

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        {t.nav.skip}
      </a>

      <HeaderShell>
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8" aria-label="Main">
          <a href={lang === 'de' ? '/de' : '/'} className="flex items-center gap-2.5" aria-label="Rota">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest font-serif text-xl leading-none text-white">R</span>
            <span className="text-[17px] font-semibold text-forest">Rota</span>
          </a>
          <div className="ml-4 hidden items-center gap-6 text-[15px] text-ink/75 md:flex">
            <a href="#week" data-section="week" className="hover:text-ink">{t.nav.features}</a>
            <a href="#pricing" data-section="pricing" className="hover:text-ink">{t.nav.pricing}</a>
            <a href="#faq" data-section="faq" className="hover:text-ink">{t.nav.faq}</a>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <a href={t.nav.langHref} className="text-sm text-ink/70 hover:text-ink" hrefLang={lang === 'de' ? 'en' : 'de'}>
              {t.nav.lang}
            </a>
            <a href={demoHref('Rota demo')} {...(external && { target: '_blank', rel: 'noopener' })} className="btn-motion hidden h-10 items-center rounded-lg bg-forest px-4 text-sm font-medium text-white hover:bg-forest-600 sm:inline-flex">
              {t.nav.demo}
            </a>
          </div>
        </nav>
      </HeaderShell>

      <main id="main">
        {/* Hero: the headline, and a rota that fills itself in */}
        <section id="hero" className="relative -mt-16 overflow-hidden pt-16">
          <div aria-hidden className="rota-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 md:pt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:pb-20">
          <div className="intro">
            <h1 className="font-serif text-[44px] leading-[1.02] tracking-[-0.01em] text-forest sm:text-6xl lg:text-[64px]">{t.hero.title}</h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink/80">{t.hero.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={demoHref('Rota demo')} {...(external && { target: '_blank', rel: 'noopener' })} className={primary}>
                {t.hero.primary}
              </a>
              <a href="#pricing" className={secondary}>
                {t.hero.secondary}
              </a>
            </div>
            <p className="mt-5 text-sm text-muted">{t.hero.note}</p>
          </div>
          <div className="intro-board">
            <ShiftBoard t={t.hero.board} />
          </div>
          </div>

          {/* A slow ticker of shifts being planned; pauses on hover */}
          <div className="ticker relative overflow-hidden border-y border-sage-dark/50 bg-white/40 py-3" aria-hidden>
            <div className="ticker-track flex w-max gap-3">
              {[...t.ticker, ...t.ticker].map(([name, shift, time, tone], i) => (
                <span key={i} className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-line">
                  <span className={`h-2.5 w-2.5 rounded-full ${tone === 'morning' ? 'bg-morning' : tone === 'evening' ? 'bg-evening' : tone === 'night' ? 'bg-night' : 'bg-day'} ring-1 ring-black/5`} />
                  <span className="font-medium">{name}</span>
                  <span className="text-muted">
                    {shift} {time}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* A restaurant week, day by day */}
        <section id="week" className="border-t border-sage-dark/50 bg-paper">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="max-w-2xl font-serif text-4xl leading-[1.08] text-forest sm:text-5xl">{t.week.title}</h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/75">{t.week.lead}</p>
            <div className="mt-14">
            <WeekRail count={t.week.days.length}>
              {t.week.days.map((d, i) => (
                <li key={d.img} data-day className="grid gap-6 lg:grid-cols-[9rem_minmax(0,4fr)_minmax(0,7fr)] lg:gap-10">
                  <DayMark index={i} label={d.day} />
                  <div className="lg:pt-2">
                    <h3 className="text-2xl font-semibold leading-snug">{d.title}</h3>
                    <p className="mt-3 max-w-[34rem] text-[17px] leading-relaxed text-ink/75">{d.body}</p>
                  </div>
                  <Reveal variant="image" className={NARROW.has(d.img) ? 'max-w-sm lg:justify-self-start' : ''}>
                    <img
                      src={`/screens/${d.img}.webp`}
                      alt={d.alt}
                      loading="lazy"
                      className="w-full rounded-xl border border-line bg-white shadow-[0_18px_44px_-24px_rgba(30,64,52,0.4)]"
                    />
                  </Reveal>
                </li>
              ))}
            </WeekRail>
            </div>
          </div>
        </section>

        {/* Rules band */}
        <section className="bg-forest text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:py-24">
            <div>
              <h2 className="font-serif text-4xl leading-[1.08] sm:text-5xl">{t.rules.title}</h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-white/75">{t.rules.lead}</p>
            </div>
            <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {t.rules.items.map(([k, v], i) => (
                <CheckedRule key={k} title={k} body={v} delay={i * 120} />
              ))}
            </dl>
          </div>
        </section>

        {/* Everything else, and who it's for */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="font-serif text-4xl leading-[1.08] text-forest sm:text-5xl">{t.more.title}</h2>
          <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {t.more.items.map(([k, v], i) => (
              <Reveal key={k} delay={(i % 3) * 90}>
                <dt className="font-semibold">{k}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-ink/70">{v}</dd>
              </Reveal>
            ))}
          </dl>

          <div className="mt-20 grid gap-10 border-t border-sage-dark/60 pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
            <h2 className="font-serif text-3xl leading-[1.1] text-forest sm:text-4xl">{t.roles.title}</h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {t.roles.items.map(([k, v]) => (
                <div key={k}>
                  <h3 className="font-semibold">{k}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink/70">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing: one plan, set like a menu card */}
        <section id="pricing" className="border-y border-sage-dark/50 bg-paper">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-serif text-4xl leading-[1.08] text-forest sm:text-5xl">{t.pricing.title}</h2>
              <p className="mt-4 text-lg text-ink/75">{t.pricing.lead}</p>
            </div>
            <Reveal className="mx-auto mt-12 max-w-xl">
            <div className="rounded-2xl border border-line bg-white p-7 shadow-[0_24px_60px_-30px_rgba(30,64,52,0.45)] sm:p-10">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-4xl text-forest">{t.pricing.name}</span>
                <Leader />
                <span className="font-serif text-5xl text-forest sm:text-6xl">{price}</span>
              </div>
              <p className="mt-1 text-right text-sm text-muted">{t.pricing.per}</p>
              <ul className="mt-8 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {t.pricing.includes.map((x) => (
                  <li key={x} className="flex gap-2.5 text-[15px]">
                    <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden>
                      <path d="M5 10.5l3.2 3.2L15 6.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {x}
                  </li>
                ))}
              </ul>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href={demoHref('Rota demo')} {...(external && { target: '_blank', rel: 'noopener' })} className={`${primary} sm:flex-1`}>
                  {t.pricing.cta}
                </a>
                <a href={talkHref('Rota')} className={`${secondary} sm:flex-1`}>
                  {t.pricing.talk}
                </a>
              </div>
              <p className="mt-5 text-center text-sm text-muted">{t.pricing.vat}</p>
            </div>
            </Reveal>
          </div>
        </section>

        {/* Questions */}
        <section id="faq" className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="font-serif text-4xl leading-[1.08] text-forest sm:text-5xl">{t.faq.title}</h2>
          <div className="mt-10 divide-y divide-sage-dark/70 border-y border-sage-dark/70">
            {t.faq.items.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-sage-dark transition-transform group-open:rotate-45" aria-hidden>
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </span>
                </summary>
                <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-ink/75">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing call to action */}
        <section id="final" className="px-5 pb-20 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 rounded-3xl bg-forest px-7 py-14 text-white sm:px-12 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-serif text-4xl leading-[1.08] sm:text-5xl">{t.final.title}</h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/75">{t.final.body}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={demoHref('Rota demo')} {...(external && { target: '_blank', rel: 'noopener' })} className={`${btn} bg-white text-forest hover:bg-forest-50`}>
                {t.final.cta}
              </a>
              <a href={talkHref('Rota')} className={`${btn} text-white ring-1 ring-white/40 hover:ring-white`}>
                {t.final.talk}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-sage-dark/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            <span className="font-semibold text-forest">Rota.</span> {t.footer.rights}
          </p>
          <div className="flex gap-6">
            {/* Required in Germany: link these to the real Impressum and Datenschutzerklärung before launch. */}
            <a href="#" className="hover:text-ink">{t.footer.imprint}</a>
            <a href="#" className="hover:text-ink">{t.footer.privacy}</a>
            <a href={`mailto:${site.email}`} className="hover:text-ink">{t.footer.contact}</a>
          </div>
        </div>
      </footer>
      <MobileCta price={price} per={t.pricing.perShort} label={t.nav.demo} href={demoHref('Rota demo')} external={external} />
    </>
  )
}
