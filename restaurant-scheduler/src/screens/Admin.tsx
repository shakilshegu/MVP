import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, History as HistoryIcon, LogOut, Plus, RotateCcw, Search, Store } from 'lucide-react'
import { useStore } from '../lib/store'
import { navigate } from '../lib/hooks'
import { fmtDayHeading, fmtStamp, fmtTime, relTime } from '../lib/date'
import { useT } from '../i18n'
import { deptName, historyText } from '../i18n/format'
import { LanguageToggle } from '../components/LanguageSwitch'
import { DEPTS, PERMS } from '../lib/types'
import type { HistoryAction } from '../lib/types'
import { NoAccess } from '../components/Shell'
import { cityLabel, GERMAN_CITIES } from '../lib/weather'
import { Badge, Button, cx, deptDot, EmptyState, Field, Modal, PageHeader, Segmented, Switch } from '../components/ui'

const GROUPS = {
  Schedule: ['assigned', 'removed', 'tasksUpdated', 'moved', 'published', 'shiftEdited', 'shiftCreated'],
  Team: ['employeeAdded', 'employeeEdited', 'availability'],
  Leave: ['leaveApproved', 'leaveDeclined'],
  Admin: ['permissions', 'branch'],
} satisfies Record<string, HistoryAction[]>
type Group = 'All' | keyof typeof GROUPS

export function History() {
  const { s, branch } = useStore()
  const { t } = useT()
  const [group, setGroup] = useState<Group>('All')
  const [q, setQ] = useState('')
  const list = s.history
    .filter((h) => h.branchId === branch!.id)
    .filter((h) => group === 'All' || (GROUPS[group] as HistoryAction[]).includes(h.action))
    .filter((h) => {
      if (!q) return true
      const x = historyText(t, h)
      return `${x.subject} ${h.by} ${x.from ?? ''} ${x.to ?? ''} ${t(`history.action.${h.action}`)}`.toLowerCase().includes(q.toLowerCase())
    })
    .sort((a, b) => b.at.localeCompare(a.at))

  const days = list.reduce<Record<string, typeof list>>((m, h) => {
    const k = fmtDayHeading(h.at)
    ;(m[k] ??= []).push(h)
    return m
  }, {})

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t('history.title')} sub={t('history.sub', { branch: branch!.name })} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<Group>
          label={t('history.type')}
          value={group}
          onChange={setGroup}
          options={(['All', ...Object.keys(GROUPS)] as Group[]).map((g) => ({ value: g, label: t(`history.groups.${g}`) }))}
        />
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">{t('history.searchA11y')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('history.searchPlaceholder')} className="input pl-9" />
        </label>
      </div>
      {list.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<HistoryIcon className="h-5 w-5" />} title={t('history.emptyTitle')} body={t('history.emptyBody')} />
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(days).map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-xs font-medium text-muted">{day}</h2>
              <ul className="panel divide-y divide-line">
                {items.map((h) => {
                  const x = historyText(t, h)
                  return (
                  <li key={h.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-start sm:gap-4">
                    <time dateTime={h.at} title={fmtStamp(h.at)} className="w-16 shrink-0 text-[13px] text-muted">
                      {fmtTime(h.at)}
                    </time>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge tone={h.action === 'published' ? 'dark' : h.action === 'removed' || h.action === 'leaveDeclined' ? 'danger' : 'neutral'}>{t(`history.action.${h.action}`)}</Badge>
                        <span className="font-medium">{x.subject}</span>
                      </div>
                      {(x.from || x.to) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                          {x.from && <span className={x.to ? 'line-through decoration-muted/60' : ''}>{x.from}</span>}
                          {x.from && x.to && <ArrowRight className="h-3 w-3" />}
                          {x.to && <span className="text-ink/80">{x.to}</span>}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-[13px] text-muted">
                      {h.by} · {relTime(h.at)}
                    </div>
                  </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export function Permissions() {
  const { s, a, me, toast } = useStore()
  const { t } = useT()
  const isAdmin = me != null && me.role !== 'manager'
  if (!isAdmin) return <NoAccess what={t('permissions.what')} />
  const managers = s.managers.filter((m) => m.role === 'manager')
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t('permissions.title')} sub={t('permissions.sub')} />
      <section className="panel overflow-hidden">
        <div className="grid grid-cols-[1fr_96px_96px] border-b border-line bg-paper px-5 py-2.5 text-xs font-medium text-muted">
          <span>{t('permissions.permission')}</span>
          <span className="text-center">{t('role.manager')}</span>
          <span className="text-center">{t('role.super')}</span>
        </div>
        <ul className="divide-y divide-line">
          {PERMS.map((p) => {
            const label = t(`perm.${p}.label`)
            return (
              <li key={p} className="grid grid-cols-[1fr_96px_96px] items-center px-5 py-3.5">
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-[13px] text-muted">{t(`perm.${p}.hint`)}</div>
                </div>
                <div className="flex justify-center">
                  <Switch
                    label={t('permissions.forManagers', { perm: label })}
                    checked={s.perms[p]}
                    onChange={(v) => {
                      a.setPerm(p, v)
                      toast(t(v ? 'permissions.toastOn' : 'permissions.toastOff', { perm: label }))
                    }}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch label={t('permissions.forSupers', { perm: label })} checked disabled onChange={() => {}} />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <h2 className="mb-3 mt-8 text-sm font-semibold">{t('permissions.managersBranches')}</h2>
      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-5 py-2.5 font-medium">{t('role.manager')}</th>
              {s.branches.map((b) => (
                <th key={b.id} className="px-3 py-2.5 text-center font-medium">
                  {b.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {managers.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-[13px] text-muted">{m.email}</div>
                </td>
                {s.branches.map((b) => (
                  <td key={b.id} className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={t('permissions.manages', { name: m.name, branch: b.name })}
                      checked={m.branchIds.includes(b.id)}
                      onChange={(e) => a.setManagerBranch(m.id, b.id, e.target.checked)}
                      className="h-4 w-4 accent-forest"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

type Tab = 'restaurant' | 'hours' | 'departments' | 'branches' | 'account'

export function Settings({ tab: initial }: { tab: string | null }) {
  const { s, a, me, branch, can, toast } = useStore()
  const { t, locale } = useT()
  const tabs: { value: Tab; label: string }[] = (['restaurant', 'hours', 'departments', ...(can('manageBranches') ? ['branches' as const] : []), 'account'] as Tab[]).map((v) => ({
    value: v,
    label: t(`settings.tabs.${v}`),
  }))
  const [tab, setTab] = useState<Tab>(tabs.some((t) => t.value === initial) ? (initial as Tab) : 'restaurant')
  const [name, setName] = useState(branch!.name)
  const [address, setAddress] = useState(branch!.address)
  const [city, setCity] = useState(branch!.city)
  const [opens, setOpens] = useState(branch!.opens)
  const [closes, setCloses] = useState(branch!.closes)
  const [adding, setAdding] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const saveBranch = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    a.saveBranch({ id: branch!.id, name: name.trim(), address, city, opens, closes })
    toast(t('settings.saved'))
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('settings.title')} />
      <div className="mb-6 overflow-x-auto">
        <Segmented label={t('settings.sectionA11y')} value={tab} onChange={setTab} options={tabs} />
      </div>

      {tab === 'restaurant' && (
        <form onSubmit={saveBranch} className="panel space-y-4 p-6">
          <Field label={t('settings.branchName')} htmlFor="s-name" error={name.trim() ? undefined : t('settings.errName')}>
            <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('settings.address')} htmlFor="s-addr">
            <input id="s-addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label={t('settings.city')} htmlFor="s-city" hint={t('settings.cityHint')}>
            <select id="s-city" className="input" value={city} onChange={(e) => setCity(e.target.value)}>
              {GERMAN_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {cityLabel(c.name, locale)}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              {t('common.save')}
            </Button>
          </div>
        </form>
      )}

      {tab === 'hours' && (
        <form onSubmit={saveBranch} className="panel space-y-4 p-6">
          <p className="text-sm text-muted">{t('settings.hoursIntro', { branch: branch!.name })}</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('settings.opens')} htmlFor="s-open">
              <input id="s-open" type="time" className="input" value={opens} onChange={(e) => setOpens(e.target.value)} />
            </Field>
            <Field label={t('settings.closes')} htmlFor="s-close" hint={closes < opens ? t('settings.closesAfterMidnight') : undefined}>
              <input id="s-close" type="time" className="input" value={closes} onChange={(e) => setCloses(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              {t('settings.saveHours')}
            </Button>
          </div>
        </form>
      )}

      {tab === 'departments' && (
        <div className="panel">
          <ul className="divide-y divide-line">
            {DEPTS.map((d) => {
              const n = s.employees.filter((e) => e.branchId === branch!.id && e.dept === d).length
              return (
                <li key={d} className="flex items-center gap-3 px-5 py-4">
                  <span className={cx('h-2.5 w-2.5 rounded-full', deptDot[d])} />
                  <span className="flex-1 text-sm font-medium">{deptName(t, d)}</span>
                  <span className="text-[13px] text-muted">{t('common.people', { count: n })}</span>
                </li>
              )
            })}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[13px] text-muted">{t('settings.deptOrder', { list: DEPTS.map((d) => deptName(t, d)).join(', ') })}</p>
        </div>
      )}

      {tab === 'branches' && (
        <div className="space-y-3">
          <ul className="panel divide-y divide-line">
            {s.branches.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-4">
                <Store className="h-4 w-4 text-forest" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{b.name}</div>
                  <div className="truncate text-[13px] text-muted">{b.address}</div>
                </div>
                <span className="text-[13px] text-muted">{t('common.people', { count: s.employees.filter((e) => e.branchId === b.id).length })}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => navigate('/permissions')}>
              {t('settings.assignManagers')}
            </Button>
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> {t('settings.addBranch')}
            </Button>
          </div>
        </div>
      )}

      {tab === 'account' && (
        <div className="space-y-4">
          <div className="panel p-6">
            <div className="text-lg font-semibold">{me?.name}</div>
            <div className="text-sm text-muted">{me?.email}</div>
            <div className="mt-2">
              <Badge tone="green">{me && t(`role.${me.role}`)}</Badge>
            </div>
            <Button
              className="mt-5"
              onClick={() => {
                a.logout()
                navigate('/login')
              }}
            >
              <LogOut className="h-4 w-4" /> {t('common.signOut')}
            </Button>
          </div>
          <div className="panel p-6">
            <div className="text-sm font-medium">{t('settings.language')}</div>
            <div className="mb-3 text-[13px] text-muted">{t('settings.languageHint')}</div>
            <LanguageToggle />
          </div>
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <div className="text-sm font-medium">{t('settings.resetTitle')}</div>
              <div className="text-[13px] text-muted">{t('settings.resetBody')}</div>
            </div>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" /> {t('settings.reset')}
            </Button>
          </div>
        </div>
      )}

      {adding && <AddBranch onClose={() => setAdding(false)} />}
      {confirmReset && (
        <Modal
          title={t('settings.resetConfirmTitle')}
          description={t('settings.resetConfirmBody')}
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <Button onClick={() => setConfirmReset(false)}>{t('common.cancel')}</Button>
              <Button
                variant="danger"
                onClick={() => {
                  a.reset()
                  setConfirmReset(false)
                  toast(t('settings.resetDone'))
                }}
              >
                {t('settings.resetData')}
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}

function AddBranch({ onClose }: { onClose: () => void }) {
  const { a, toast } = useStore()
  const { t, locale } = useT()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Berlin')
  const [err, setErr] = useState('')
  return (
    <Modal
      title={t('settings.addBranch')}
      description={t('settings.addBranchDesc')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="branch-form">
            {t('settings.addBranch')}
          </Button>
        </>
      }
    >
      <form
        id="branch-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return setErr(t('settings.branchErr'))
          a.saveBranch({ name: name.trim(), address: address.trim(), city, opens: '10:00', closes: '23:00' })
          toast(t('settings.branchAdded', { name: name.trim() }))
          onClose()
        }}
      >
        <Field label={t('templates.name')} htmlFor="b-name" error={err}>
          <input id="b-name" autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('settings.branchPlaceholder')} />
        </Field>
        <Field label={t('settings.city')} htmlFor="b-city">
          <select id="b-city" className="input" value={city} onChange={(e) => setCity(e.target.value)}>
            {GERMAN_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {cityLabel(c.name, locale)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('settings.address')} htmlFor="b-addr" hint={t('common.optional')}>
          <input id="b-addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
