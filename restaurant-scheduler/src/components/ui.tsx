import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, RotateCw, X } from 'lucide-react'
import type { Dept, Employee, Tone } from '../lib/types'
import { useToasts } from '../lib/store'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'; size?: 'sm' | 'md' }
const variants = {
  primary: 'bg-forest text-white hover:bg-forest-600 active:bg-forest-700',
  secondary: 'bg-white text-ink border border-line hover:border-sage-dark hover:bg-paper',
  ghost: 'text-muted hover:text-ink hover:bg-forest-50',
  quiet: 'bg-forest-50 text-forest hover:bg-forest-100',
  danger: 'bg-white text-danger border border-danger/30 hover:bg-danger-50',
}
export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...p }: BtnProps) {
  return (
    <button
      type={type}
      {...p}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45',
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
      className={cx('inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-forest-50 hover:text-ink', className)}
    />
  )
}

function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
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
  return (
    <dialog {...d} className={cx('w-[calc(100%-32px)] animate-pop rounded-2xl bg-white p-0 text-ink shadow-2xl', width)}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
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
  return (
    <dialog
      {...d}
      className="m-0 ml-auto flex h-full max-h-none w-full max-w-md animate-slide flex-col bg-white p-0 text-ink shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <IconButton label="Close" onClick={onClose}>
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
      <dialog {...d} className="m-0 mt-auto max-h-[85vh] w-full max-w-none animate-rise overflow-hidden rounded-t-2xl bg-white p-0 text-ink shadow-2xl">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-sage-dark" />
        {children}
      </dialog>
    )
  }
  return (
    <dialog
      {...d}
      className="bare fixed m-0 max-h-[min(560px,calc(100vh-16px))] overflow-hidden rounded-xl border border-line bg-white p-0 text-ink shadow-xl"
      style={{ width, top: pos?.top ?? anchor.bottom + 6, left: pos?.left ?? anchor.left, visibility: pos ? 'visible' : 'hidden' }}
    >
      {children}
    </dialog>
  )
}

const deptBg: Record<Dept, string> = { Bar: 'bg-[#F3E2C2] text-[#6E4610]', Service: 'bg-[#CFE6DC] text-[#1D5244]', Kitchen: 'bg-[#EFD9D4] text-[#5E302A]' }
export const deptDot: Record<Dept, string> = { Bar: 'bg-bar', Service: 'bg-service', Kitchen: 'bg-kitchen' }
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

export function Avatar({ e, size = 36 }: { e: Pick<Employee, 'name' | 'dept' | 'photo'>; size?: number }) {
  return e.photo ? (
    <img src={e.photo} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', deptBg[e.dept])}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(e.name)}
    </span>
  )
}

export function DeptTag({ dept }: { dept: Dept }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
      <span className={cx('h-2 w-2 rounded-full', deptDot[dept])} />
      {dept}
    </span>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'green' | 'warn' | 'danger' | 'dark'; children: ReactNode }) {
  const c = {
    neutral: 'bg-paper text-muted border-line',
    green: 'bg-forest-50 text-forest border-forest-100',
    warn: 'bg-warn-50 text-warn border-[#F3DFAE]',
    danger: 'bg-danger-50 text-danger border-[#F6CFCA]',
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
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-white/70 p-1 ring-1 ring-line">
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
      <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
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
  return (
    <EmptyState
      icon={<AlertTriangle className="h-5 w-5" />}
      title={`Couldn’t load ${what}`}
      body="There’s no connection to the server. Check your internet connection, then try again."
      action={
        <Button variant="primary" onClick={onRetry}>
          <RotateCw className="h-4 w-4" /> Try again
        </Button>
      }
    />
  )
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cx('animate-pulse rounded-md bg-sage/70', className)} />

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
        <div key={t.id} className="pointer-events-auto flex animate-pop items-center gap-4 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-xl">
          <span>{t.msg}</span>
          {t.action && (
            <button
              className="font-semibold text-[#A8D5BF] hover:text-white"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
