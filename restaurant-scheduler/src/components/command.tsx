import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, CalendarDays, CornerDownLeft, FileText, Search, User } from 'lucide-react'
import { useStore } from '../lib/store'
import { navigate } from '../lib/hooks'
import { addDays, fmtDay, fmtRange, startOfWeek, todayKey, toKey } from '../lib/date'
import { useT } from '../i18n'
import { Avatar, cx } from './ui'

export type CommandPage = { to: string; label: string; icon: ReactNode }
type Hit = { id: string; group: 'pages' | 'people' | 'actions' | 'dates'; label: string; hint?: string; icon: ReactNode; to: string }

/** Reads "24.10", "24/10/2026" or "2026-10-24" as a date key; null otherwise. */
function parseDate(q: string): string | null {
  const iso = q.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return toKey(new Date(+iso[1], +iso[2] - 1, +iso[3]))
  const dm = q.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\.?$/)
  if (!dm) return null
  const year = dm[3] ? (dm[3].length === 2 ? 2000 + +dm[3] : +dm[3]) : new Date().getFullYear()
  const d = new Date(year, +dm[2] - 1, +dm[1])
  return isNaN(d.getTime()) || d.getDate() !== +dm[1] ? null : toKey(d)
}

/** Ctrl/Cmd + K: jump to any page, person, action or date. */
export function CommandPalette({ pages, onClose }: { pages: CommandPage[]; onClose: () => void }) {
  const { s, branch, can } = useStore()
  const { t } = useT()
  const ref = useRef<HTMLDialogElement>(null)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase()
    const has = (x: string) => !needle || x.toLowerCase().includes(needle)
    const week = startOfWeek(todayKey())
    const actions: Hit[] = [
      { id: 'a-week', group: 'actions', label: t('command.thisWeek'), icon: <CalendarDays className="h-4 w-4" />, to: '/schedule' },
      { id: 'a-next', group: 'actions', label: t('command.nextWeek'), hint: fmtRange(addDays(week, 7), addDays(week, 13)), icon: <CalendarDays className="h-4 w-4" />, to: `/schedule?week=${addDays(week, 7)}` },
      { id: 'a-review', group: 'actions', label: t('command.review'), icon: <ArrowRight className="h-4 w-4" />, to: '/review' },
      ...(can('createEmployees') ? [{ id: 'a-add', group: 'actions' as const, label: t('team.add'), icon: <User className="h-4 w-4" />, to: '/team?add=1' }] : []),
      { id: 'a-ann', group: 'actions', label: t('announce.new'), icon: <FileText className="h-4 w-4" />, to: '/announcements' },
    ]
    const people: Hit[] = s.employees
      .filter((e) => e.branchId === branch!.id && (needle ? has(e.name) || has(e.position) : false))
      .slice(0, 6)
      .map((e) => ({ id: e.id, group: 'people', label: e.name, hint: e.position, icon: <Avatar e={e} size={20} />, to: `/team/${e.id}` }))
    const date = parseDate(needle)
    const dates: Hit[] = date
      ? [
          { id: 'd-week', group: 'dates', label: t('command.weekOf', { range: fmtRange(startOfWeek(date), addDays(startOfWeek(date), 6)) }), icon: <CalendarDays className="h-4 w-4" />, to: `/schedule?week=${startOfWeek(date)}` },
          { id: 'd-report', group: 'dates', label: t('command.reportOf', { date: fmtDay(date) }), icon: <FileText className="h-4 w-4" />, to: `/report?date=${date}` },
        ]
      : []
    return [
      ...dates,
      ...people,
      ...pages.filter((p) => has(p.label)).map((p) => ({ id: p.to, group: 'pages' as const, label: p.label, icon: p.icon, to: p.to })),
      ...actions.filter((x) => has(x.label)),
    ]
  }, [q, s.employees, branch, pages, t, can])

  useEffect(() => setActive(0), [q])

  const go = (h: Hit | undefined) => {
    if (!h) return
    onClose()
    navigate(h.to)
  }

  const groups = (['dates', 'people', 'pages', 'actions'] as const).filter((g) => hits.some((h) => h.group === g))

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onMouseDown={(e) => e.target === ref.current && onClose()}
      aria-label={t('command.title')}
      className="mt-[12vh] w-[calc(100%-32px)] max-w-lg animate-pop overflow-hidden rounded-2xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-inverse/30"
    >
      <label className="flex items-center gap-3 border-b border-line px-4">
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((i) => Math.min(hits.length - 1, i + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((i) => Math.max(0, i - 1))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              go(hits[active])
            }
          }}
          placeholder={t('command.placeholder')}
          aria-label={t('command.title')}
          className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
        <kbd className="rounded border border-line px-1.5 text-[11px] text-muted">Esc</kbd>
      </label>
      <div className="max-h-[50vh] overflow-y-auto p-2">
        {hits.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">{t('command.nothing')}</p>}
        {groups.map((g) => (
          <div key={g} className="mb-1">
            <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{t(`command.groups.${g}`)}</div>
            {hits
              .filter((h) => h.group === g)
              .map((h) => {
                const i = hits.indexOf(h)
                return (
                  <button
                    key={h.id}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(h)}
                    className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm', i === active ? 'bg-forest-50 text-forest' : 'hover:bg-paper')}
                  >
                    <span className="flex h-5 w-5 items-center justify-center text-muted [&_svg]:h-4 [&_svg]:w-4">{h.icon}</span>
                    <span className="flex-1 truncate font-medium">{h.label}</span>
                    {h.hint && <span className="truncate text-xs text-muted">{h.hint}</span>}
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                  </button>
                )
              })}
          </div>
        ))}
      </div>
      <div className="border-t border-line bg-paper px-4 py-2 text-[11px] text-muted">{t('command.tip')}</div>
    </dialog>
  )
}
