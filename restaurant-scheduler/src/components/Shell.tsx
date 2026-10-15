import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bell,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  Clock3,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Plane,
  Settings,
  ShieldCheck,
  Store,
  Users,
  UserRoundCheck,
  WifiOff,
  X,
  Megaphone,
  ClipboardCheck,
  Search,
  Send,
  Hourglass,
  UserPlus,
} from 'lucide-react'
import { branchChanges, useStore } from '../lib/store'
import { navigate, useOnline } from '../lib/hooks'
import { relTime } from '../lib/date'
import { useT } from '../i18n'
import { noticeText } from '../i18n/format'
import type { Notice, NoticeKind } from '../lib/types'
import { LanguageMenu } from './LanguageSwitch'
import { CommandPalette } from './command'
import { Badge, cx, IconButton, Popover } from './ui'

type Item = { to: string; label: string; icon: ReactNode; match: (p: string) => boolean; badge?: number; superOnly?: boolean }

export default function Shell({ path, children }: { path: string; children: ReactNode }) {
  const { s, me, branch, pendingLeave, company, isOwner, a } = useStore()
  const isAdmin = me != null && me.role !== 'manager'
  const { t } = useT()
  const online = useOnline()
  const [navOpen, setNavOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const items: { group?: string; items: Item[] }[] = [
    {
      items: [
        { to: '/dashboard', label: t('nav.today'), icon: <LayoutDashboard />, match: (p) => p === '/dashboard' || p === '/' },
        { to: '/schedule', label: t('nav.weekly'), icon: <CalendarDays />, match: (p) => p.startsWith('/schedule') || p === '/review' || p === '/published' },
        { to: '/month', label: t('nav.month'), icon: <CalendarRange />, match: (p) => p === '/month' },
        { to: '/templates', label: t('nav.templates'), icon: <Clock3 />, match: (p) => p === '/templates' },
        { to: '/report', label: t('nav.report'), icon: <ClipboardCheck />, match: (p) => p === '/report' },
      ],
    },
    {
      group: t('nav.people'),
      items: [
        { to: '/team', label: t('nav.team'), icon: <Users />, match: (p) => p.startsWith('/team') },
        { to: '/availability', label: t('nav.availability'), icon: <UserRoundCheck />, match: (p) => p === '/availability' },
        { to: '/leave', label: t('nav.leave'), icon: <Plane />, match: (p) => p === '/leave', badge: pendingLeave.length },
        { to: '/announcements', label: t('nav.announcements'), icon: <Megaphone />, match: (p) => p === '/announcements' },
      ],
    },
    {
      group: t('nav.admin'),
      items: [
        { to: '/history', label: t('nav.history'), icon: <History />, match: (p) => p === '/history' },
        { to: '/permissions', label: t('nav.permissions'), icon: <ShieldCheck />, match: (p) => p === '/permissions', superOnly: true },
        { to: '/settings', label: t('nav.settings'), icon: <Settings />, match: (p) => p === '/settings' },
      ],
    },
  ]

  const nav = (
    <nav aria-label={t('nav.main')} className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest font-serif text-xl leading-none text-white">R</span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-tight text-forest">Rota</span>
          <span className="block truncate text-xs text-muted">{company?.name}</span>
        </span>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-3">
        {items.map((g, i) => (
          <div key={i}>
            {g.group && <div className="px-3 pb-1.5 text-xs font-medium text-muted">{g.group}</div>}
            <ul className="space-y-0.5">
              {g.items
                .filter((it) => !it.superOnly || isAdmin)
                .map((it) => {
                  const active = it.match(path)
                  return (
                    <li key={it.to}>
                      <a
                        href={'#' + it.to}
                        onClick={() => setNavOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cx(
                          'flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors [&>svg]:h-[18px] [&>svg]:w-[18px]',
                          active ? 'bg-surface font-medium text-forest shadow-sm' : 'text-ink/75 hover:bg-surface/50 hover:text-ink',
                        )}
                      >
                        {it.icon}
                        <span className="flex-1">{it.label}</span>
                        {!!it.badge && <span className="rounded-full bg-bark px-1.5 text-[11px] font-semibold leading-5 text-white">{it.badge}</span>}
                      </a>
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </div>
      <div className="m-3 flex items-center gap-3 rounded-xl bg-surface/60 p-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm font-semibold text-white">
          {me?.name
            .split(' ')
            .map((x) => x[0])
            .join('')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{me?.name}</div>
          <div className="text-xs text-muted">{me && t(`role.${me.role}`)}</div>
        </div>
        <SignOut />
      </div>
    </nav>
  )

  const changes = branch ? branchChanges(s, branch.id).length : 0

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 border-r border-sage-dark/60 lg:block">{nav}</aside>
      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-inverse/40" onClick={() => setNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-pop bg-sage shadow-2xl">
            <IconButton label={t('nav.closeMenu')} className="absolute right-3 top-4" onClick={() => setNavOpen(false)}>
              <X className="h-5 w-5" />
            </IconButton>
            {nav}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {isOwner && company && (
          <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-forest px-4 py-2 text-center text-[13px] text-white">
            {t('shell.support', { company: company.name })}
            <button
              onClick={() => {
                a.selectCompany(null)
                navigate('/')
              }}
              className="font-semibold underline underline-offset-2 hover:text-forest-100"
            >
              {t('shell.backToPlatform')}
            </button>
          </div>
        )}
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 bg-bark px-4 py-2 text-center text-[13px] text-white">
            <WifiOff className="h-4 w-4 shrink-0" />
            {t('shell.offline')}
          </div>
        )}
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 md:px-8">
          <IconButton label={t('nav.openMenu')} className="hidden md:inline-flex lg:hidden" onClick={() => setNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </IconButton>
          <BranchSwitcher />
          <div className="flex-1" />
          <button
            onClick={() => setCmdOpen(true)}
            aria-label={t('command.title')}
            className="flex h-9 items-center gap-2 rounded-lg bg-surface/70 px-2.5 text-[13px] text-muted ring-1 ring-line hover:text-ink sm:pr-1.5"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t('command.search')}</span>
            <kbd className="hidden rounded border border-line bg-surface px-1.5 text-[11px] sm:inline">{navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          {changes > 0 && path !== '/review' && (
            <a href="#/review" className="hidden items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[13px] font-medium text-forest ring-1 ring-forest/20 hover:ring-forest/50 sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-bark" />
              {t('shell.unpublished', { count: changes })}
            </a>
          )}
          <LanguageMenu />
          <Notifications />
        </header>
        {cmdOpen && (
          <CommandPalette
            pages={items.flatMap((g) => g.items).filter((x) => !x.superOnly || isAdmin).map((x) => ({ to: x.to, label: x.label, icon: x.icon }))}
            onClose={() => setCmdOpen(false)}
          />
        )}
        <main id="main" className="flex-1 overflow-y-auto px-4 pb-8 md:px-8 md:pb-16">
          {children}
        </main>
        {/* Phone: the main places one tap away; everything else under "More". */}
        <nav aria-label={t('nav.main')} className="grid shrink-0 grid-cols-5 border-t border-sage-dark/60 bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          {[
            { to: '/dashboard', label: t('nav.today'), icon: LayoutDashboard, on: path === '/dashboard' || path === '/' },
            { to: '/schedule', label: t('nav.week'), icon: CalendarDays, on: path.startsWith('/schedule') || path === '/review' },
            { to: '/team', label: t('nav.team'), icon: Users, on: path.startsWith('/team') },
            { to: '/report', label: t('nav.reportShort'), icon: ClipboardCheck, on: path === '/report' },
          ].map((x) => (
            <a key={x.to} href={`#${x.to}`} aria-current={x.on ? 'page' : undefined} className={cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', x.on ? 'text-forest' : 'text-muted')}>
              <x.icon className="h-5 w-5" aria-hidden />
              {x.label}
            </a>
          ))}
          <button onClick={() => setNavOpen(true)} className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted">
            <Menu className="h-5 w-5" aria-hidden />
            {t('nav.more')}
            {pendingLeave.length > 0 && <span className="absolute right-[calc(50%-18px)] top-1.5 h-2 w-2 rounded-full bg-bark" aria-hidden />}
          </button>
        </nav>
      </div>
    </div>
  )
}

function SignOut() {
  const { a } = useStore()
  const { t } = useT()
  return (
    <IconButton
      label={t('common.signOut')}
      onClick={() => {
        a.logout()
        navigate('/login')
      }}
    >
      <LogOut className="h-4 w-4" />
    </IconButton>
  )
}

function BranchSwitcher() {
  const { branch, myBranches, a, me } = useStore()
  const { t } = useT()
  const isAdmin = me != null && me.role !== 'manager'
  const btn = useRef<HTMLButtonElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const multi = myBranches.length > 1
  return (
    <>
      <button
        ref={btn}
        disabled={!multi && !isAdmin}
        onClick={() => setRect(btn.current!.getBoundingClientRect())}
        className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface/50 disabled:hover:bg-transparent"
        aria-haspopup="dialog"
      >
        <Store className="h-4 w-4 shrink-0 text-forest" />
        <span className="truncate text-[15px] font-semibold text-forest">{branch?.name}</span>
        {(multi || isAdmin) && <ChevronDown className="h-4 w-4 shrink-0 text-muted" />}
      </button>
      {rect && (
        <Popover anchor={rect} onClose={() => setRect(null)} width={280}>
          <div className="p-2">
            <div className="px-3 pb-1 pt-2 text-xs font-medium text-muted">{t('shell.switchBranch')}</div>
            {myBranches.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  a.selectBranch(b.id)
                  setRect(null)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-paper"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{b.name}</div>
                  <div className="truncate text-xs text-muted">{b.address}</div>
                </div>
                {b.id === branch?.id && <Check className="h-4 w-4 text-forest" />}
              </button>
            ))}
            {isAdmin && (
              <a href="#/settings?tab=branches" onClick={() => setRect(null)} className="mt-1 block rounded-lg border-t border-line px-3 py-2.5 text-sm font-medium text-forest hover:bg-paper">
                {t('shell.manageBranches')}
              </a>
            )}
          </div>
        </Popover>
      )}
    </>
  )
}

const NOTICE_GROUP: Record<NoticeKind, 'leave' | 'team' | 'schedule'> = {
  leaveRequested: 'leave',
  inviteNotAccepted: 'team',
  availabilityUpdated: 'team',
  published: 'schedule',
  approvalRequested: 'schedule',
}
const NOTICE_ICON: Record<NoticeKind, typeof Bell> = { leaveRequested: Plane, inviteNotAccepted: UserPlus, availabilityUpdated: UserRoundCheck, published: Send, approvalRequested: Hourglass }

function Notifications() {
  const { s, a, branch } = useStore()
  const { t } = useT()
  const btn = useRef<HTMLButtonElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [tab, setTab] = useState<'all' | 'unread' | 'leave' | 'team' | 'schedule'>('all')
  const unread = s.notices.filter((n) => !n.read).length
  const list = s.notices.filter((n) => (tab === 'all' ? true : tab === 'unread' ? !n.read : NOTICE_GROUP[n.kind] === tab))
  const tabs = (['all', 'unread', 'leave', 'team', 'schedule'] as const).filter((k) => k === 'all' || (k === 'unread' ? unread > 0 : s.notices.some((n) => NOTICE_GROUP[n.kind] === k)))

  /** Opens the exact item: switches to the notice's branch first, then focuses the person or change. */
  const open = (n: Notice) => {
    a.markRead(n.id)
    setRect(null)
    const other = typeof n.params.branch === 'string' ? s.branches.find((b) => b.name === n.params.branch && b.id !== branch?.id) : undefined
    if (other) a.selectBranch(other.id)
    if (n.kind === 'leaveRequested') navigate(`/leave?focus=${encodeURIComponent(String(n.params.name))}`)
    else if (n.href) navigate(n.href)
  }

  return (
    <>
      <button
        ref={btn}
        aria-label={unread ? t('shell.notificationsUnread', { count: unread }) : t('shell.notifications')}
        onClick={() => setRect(btn.current!.getBoundingClientRect())}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-forest hover:bg-surface/50"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bark px-1 text-[10px] font-semibold text-white ring-2 ring-sage">
            {unread}
          </span>
        )}
      </button>
      {rect && (
        <Popover anchor={new DOMRect(rect.right - 380, rect.top, 380, rect.height)} onClose={() => setRect(null)} width={380}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">{t('shell.notifications')}</h2>
            {unread > 0 && (
              <button onClick={() => a.markRead()} className="text-[13px] font-medium text-forest hover:underline">
                {t('shell.markAllRead')}
              </button>
            )}
          </div>
          {tabs.length > 2 && (
            <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2" role="group" aria-label={t('shell.noticeFilter')}>
              {tabs.map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  aria-pressed={tab === k}
                  className={cx('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', tab === k ? 'bg-forest text-white' : 'text-muted hover:bg-paper hover:text-ink')}
                >
                  {t(`shell.noticeTabs.${k}`)}
                  {k === 'unread' && <span className="ml-1 opacity-80">{unread}</span>}
                </button>
              ))}
            </div>
          )}
          <ul className="max-h-[420px] overflow-y-auto">
            {list.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">{t('shell.caughtUp')}</li>}
            {list.map((n) => {
              const text = noticeText(t, n)
              const Icon = NOTICE_ICON[n.kind]
              return (
                <li key={n.id}>
                  <button onClick={() => open(n)} className="flex w-full gap-3 border-b border-line/70 px-4 py-3 text-left last:border-0 hover:bg-paper">
                    <span className={cx('relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.read ? 'bg-paper text-muted' : 'bg-forest-50 text-forest')}>
                      <Icon className="h-4 w-4" aria-hidden />
                      {!n.read && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-bark ring-2 ring-surface" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx('block text-sm', !n.read && 'font-medium')}>{text.title}</span>
                      <span className="block text-[13px] text-muted">{text.body}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{relTime(n.at)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Popover>
      )}
    </>
  )
}

export function NoAccess({ what }: { what: string }) {
  const { t } = useT()
  return (
    <div className="panel mx-auto mt-10 max-w-md p-8 text-center">
      <ShieldCheck className="mx-auto h-8 w-8 text-forest" />
      <h1 className="mt-3 text-lg font-semibold">{t('shell.noAccessTitle', { what })}</h1>
      <p className="mt-1 text-sm text-muted">{t('shell.noAccessBody')}</p>
      <div className="mt-4">
        <Badge tone="neutral">{t('shell.managerAccount')}</Badge>
      </div>
    </div>
  )
}
