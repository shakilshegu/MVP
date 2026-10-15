import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, RotateCw, X } from 'lucide-react'
import type { Dept, Employee, Tone } from '../lib/types'
import { useStore, useToasts } from '../lib/store'
import { useT } from '../i18n'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'; size?: 'sm' | 'md' }
const variants = {
  primary: 'bg-forest text-white hover:bg-forest-600 active:bg-forest-700',
  secondary: 'bg-surface text-ink border border-line hover:border-sage-dark hover:bg-paper',
  ghost: 'text-muted hover:text-ink hover:bg-forest-50',
  quiet: 'bg-forest-50 text-forest hover:bg-forest-100',
  danger: 'bg-surface text-danger border border-danger/30 hover:bg-danger-50',
}
export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...p }: BtnProps) {
  return (
    <button
      type={type}
      {...p}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm',
        variants[variant],
        className,
      )}
    />
  )
}

export function IconButton({ label, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...p}
      className={cx('inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition duration-150 hover:bg-forest-50 hover:text-ink active:scale-90', className)}
    />
  )
}

function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d || d.open) return
    d.showModal()
    // Start in the first field; with none, focus the dialog itself rather than ringing the close button.
    const field =
      d.querySelector<HTMLElement>('[autofocus]') ??
      d.querySelector<HTMLElement>('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]):not([disabled]), select:not([disabled]), textarea')
    if (field) field.focus()
    else {
      d.tabIndex = -1
      d.focus()
    }
  }, [])
  return {
    ref,
    onCancel: (e: React.SyntheticEvent) => {
      e.preventDefault()
      onClose()
    },
    onMouseDown: (e: React.MouseEvent) => {
      if (e.target === ref.current) onClose()
    },
  }
}

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  width = 'max-w-lg',
}: {
  title: ReactNode
  description?: ReactNode
  onClose: () => void
  children?: ReactNode
  footer?: ReactNode
  width?: string
}) {
  const d = useDialog(onClose)
  const { t } = useT()
  return (
    <dialog {...d} className={cx('max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] animate-pop overflow-y-auto rounded-2xl bg-surface p-0 text-ink shadow-2xl', width)}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <IconButton label={t('common.close')} onClick={onClose} className="-mr-2 -mt-1">
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      {children && <div className="px-6 pt-5">{children}</div>}
      {footer && <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line bg-paper px-6 py-4">{footer}</div>}
      {!footer && <div className="h-6" />}
    </dialog>
  )
}

export function Drawer({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const d = useDialog(onClose)
  const { t } = useT()
  return (
    <dialog
      {...d}
      className="m-0 ml-auto flex h-full max-h-none w-full max-w-md animate-slide flex-col bg-surface p-0 text-ink shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <IconButton label={t('common.close')} onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="flex gap-2 border-t border-line bg-paper px-6 py-4">{footer}</div>}
    </dialog>
  )
}

/** Anchored to a rect on desktop; a bottom sheet on phones. */
export function Popover({ anchor, onClose, children, width = 340 }: { anchor: DOMRect; onClose: () => void; children: ReactNode; width?: number }) {
  const d = useDialog(onClose)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const sheet = window.innerWidth < 640
  useLayoutEffect(() => {
    if (sheet || !d.ref.current) return
    const h = d.ref.current.offsetHeight
    const below = anchor.bottom + 6
    const top = below + h > window.innerHeight - 8 ? Math.max(8, anchor.top - h - 6) : below
    const left = Math.min(Math.max(8, anchor.left), window.innerWidth - width - 8)
    setPos({ top, left })
  }, [anchor, width, sheet, d.ref])
  if (sheet) {
    return (
      <dialog {...d} className="m-0 mt-auto max-h-[85vh] w-full max-w-none animate-rise overflow-hidden rounded-t-2xl bg-surface p-0 text-ink shadow-2xl">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-sage-dark" />
        {children}
      </dialog>
    )
  }
  return (
    <dialog
      {...d}
      className="bare fixed m-0 max-h-[min(560px,calc(100vh-16px))] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink shadow-xl"
      style={{ width, top: pos?.top ?? anchor.bottom + 6, left: pos?.left ?? anchor.left, visibility: pos ? 'visible' : 'hidden' }}
    >
      {children}
    </dialog>
  )
}

export const toneCls: Record<Tone, string> = {
  morning: 'bg-morning text-morning-ink',
  day: 'bg-day text-day-ink',
  evening: 'bg-evening text-evening-ink',
  night: 'bg-night text-night-ink',
}

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

/** Initials on the person's own colour (a light tint with the colour as text). */
export function Avatar({ e, size = 36 }: { e: Pick<Employee, 'name' | 'photo'> & { color?: string }; size?: number }) {
  const color = e.color ?? '#5C665F'
  return e.photo ? (
    <img src={e.photo} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `${color}26`, color }}
    >
      {initials(e.name)}
    </span>
  )
}

/** A small dot in a department's colour. */
export function DeptDot({ id, className = 'h-2 w-2' }: { id: Dept; className?: string }) {
  const { depts } = useStore()
  return <span aria-hidden className={cx('shrink-0 rounded-full', className)} style={{ background: depts.find((d) => d.id === id)?.color ?? '#8A938D' }} />
}

export function DeptTag({ dept }: { dept: Dept }) {
  const { depts } = useStore()
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
      <DeptDot id={dept} />
      {depts.find((d) => d.id === dept)?.name ?? dept}
    </span>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'green' | 'warn' | 'danger' | 'dark'; children: ReactNode }) {
  const c = {
    neutral: 'bg-paper text-muted border-line',
    green: 'bg-forest-50 text-forest border-forest-100',
    warn: 'bg-warn-50 text-warn border-warn/20',
    danger: 'bg-danger-50 text-danger border-danger/20',
    dark: 'bg-forest text-white border-forest',
  }[tone]
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', c)}>{children}</span>
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-[13px] text-danger">{error}</p> : hint ? <p className="mt-1.5 text-[13px] text-muted">{hint}</p> : null}
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-surface/70 p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
            value === o.value ? 'bg-forest text-white shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50', checked ? 'bg-forest' : 'bg-sage-dark')}
    >
      <span className={cx('absolute left-0 top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ what, onRetry }: { what: string; onRetry: () => void }) {
  const { t } = useT()
  return (
    <EmptyState
      icon={<AlertTriangle className="h-5 w-5" />}
      title={t('errors.couldNotLoad', { what })}
      body={t('errors.noConnection')}
      action={
        <Button variant="primary" onClick={onRetry}>
          <RotateCw className="h-4 w-4" /> {t('errors.tryAgain')}
        </Button>
      }
    />
  )
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cx('skeleton', className)} />

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="mt-2 text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Toaster() {
  const { toasts, dismiss } = useToasts()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} className={cx('pointer-events-auto flex items-center gap-4 rounded-xl bg-inverse px-4 py-3 text-sm text-white shadow-xl', t.leaving ? 'animate-toast-out' : 'animate-toast-in')}>
          <span>{t.msg}</span>
          {[t.action, t.action2].filter((x) => !!x).map((act) => (
            <button
              key={act.label}
              className="font-semibold text-[#A8D5BF] hover:text-white"
              onClick={() => {
                act.run()
                dismiss(t.id)
              }}
            >
              {act.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Placeholder page shown while a screen's data loads: same header, then list, cards or a calendar grid. */
export function PageSkeleton({ title, variant = 'list' }: { title: string; variant?: 'list' | 'cards' | 'grid' }) {
  return (
    <div className="mx-auto max-w-6xl 2xl:max-w-[1500px]" aria-busy="true">
      <PageHeader title={title} />
      {variant === 'grid' ? (
        <div className="panel grid grid-cols-7 gap-px overflow-hidden p-0">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="h-24 bg-surface p-2">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="mt-4 h-1.5 w-full" />
            </div>
          ))}
        </div>
      ) : variant === 'cards' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="panel space-y-3 p-5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="panel divide-y divide-line">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
