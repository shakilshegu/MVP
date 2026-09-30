import { useState } from 'react'
import { Check, Languages } from 'lucide-react'
import { LOCALES, useT } from '../i18n'
import { cx, Popover, Segmented } from './ui'

/** Compact picker for headers: a globe button that opens the language list. */
export function LanguageMenu({ className }: { className?: string }) {
  const { locale, setLocale, t } = useT()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const current = LOCALES.find((l) => l.code === locale)!
  return (
    <>
      <button
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setRect(new DOMRect(r.right - 200, r.top, 200, r.height))
        }}
        aria-label={`${t('shell.language')}: ${current.label}`}
        aria-haspopup="dialog"
        className={cx('inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-forest hover:bg-white/50', className)}
      >
        <Languages className="h-4 w-4" />
        {current.short}
      </button>
      {rect && (
        <Popover anchor={rect} onClose={() => setRect(null)} width={200}>
          <div role="listbox" aria-label={t('shell.language')} className="p-1.5">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                role="option"
                aria-selected={l.code === locale}
                lang={l.code}
                onClick={() => {
                  setLocale(l.code)
                  setRect(null)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-paper"
              >
                <span className="w-6 text-xs font-semibold text-muted">{l.short}</span>
                <span className="flex-1">{l.label}</span>
                {l.code === locale && <Check className="h-4 w-4 text-forest" />}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </>
  )
}

/** Inline EN | DE toggle for forms and settings. */
export function LanguageToggle() {
  const { locale, setLocale, t } = useT()
  return <Segmented label={t('shell.language')} value={locale} onChange={setLocale} options={LOCALES.map((l) => ({ value: l.code, label: <span lang={l.code}>{l.label}</span> }))} />
}
