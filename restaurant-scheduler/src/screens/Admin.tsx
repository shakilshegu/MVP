import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, History as HistoryIcon, LogOut, Plus, RotateCcw, Search, Store } from 'lucide-react'
import { useStore } from '../lib/store'
import { navigate } from '../lib/hooks'
import { fmtStamp, relTime } from '../lib/date'
import { DEPTS, PERMS } from '../lib/types'
import type { HistoryAction } from '../lib/types'
import { NoAccess } from '../components/Shell'
import { Badge, Button, cx, deptDot, EmptyState, Field, Modal, PageHeader, Segmented, Switch } from '../components/ui'

const GROUPS: Record<string, HistoryAction[]> = {
  Schedule: ['Assigned', 'Removed', 'Moved', 'Published', 'Shift edited', 'Shift created'],
  Team: ['Employee added', 'Employee edited', 'Availability'],
  Leave: ['Leave approved', 'Leave declined'],
  Admin: ['Permissions', 'Branch'],
}

export function History() {
  const { s, branch } = useStore()
  const [group, setGroup] = useState('All')
  const [q, setQ] = useState('')
  const list = s.history
    .filter((h) => h.branchId === branch!.id)
    .filter((h) => group === 'All' || GROUPS[group].includes(h.action))
    .filter((h) => !q || `${h.subject} ${h.by} ${h.from ?? ''} ${h.to ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.at.localeCompare(a.at))

  const days = list.reduce<Record<string, typeof list>>((m, h) => {
    const k = new Date(h.at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    ;(m[k] ??= []).push(h)
    return m
  }, {})

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="History" sub={`Every published change at ${branch!.name}: what changed, who did it, and when.`} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented label="Type" value={group} onChange={setGroup} options={['All', ...Object.keys(GROUPS)].map((g) => ({ value: g, label: g }))} />
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search history</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or change" className="input pl-9" />
        </label>
      </div>
      {list.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<HistoryIcon className="h-5 w-5" />} title="No changes yet" body="When you publish schedules or change settings, each change is recorded here." />
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(days).map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-xs font-medium text-muted">{day}</h2>
              <ul className="panel divide-y divide-line">
                {items.map((h) => (
                  <li key={h.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-start sm:gap-4">
                    <time dateTime={h.at} title={fmtStamp(h.at)} className="w-16 shrink-0 text-[13px] text-muted">
                      {new Date(h.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge tone={h.action === 'Published' ? 'dark' : h.action === 'Removed' || h.action === 'Leave declined' ? 'danger' : 'neutral'}>{h.action}</Badge>
                        <span className="font-medium">{h.subject}</span>
                      </div>
                      {(h.from || h.to) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                          {h.from && <span className={h.to ? 'line-through decoration-muted/60' : ''}>{h.from}</span>}
                          {h.from && h.to && <ArrowRight className="h-3 w-3" />}
                          {h.to && <span className="text-ink/80">{h.to}</span>}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-[13px] text-muted">
                      {h.by} · {relTime(h.at)}
                    </div>
                  </li>
                ))}
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
  if (me?.role !== 'super') return <NoAccess what="permissions" />
  const managers = s.managers.filter((m) => m.role === 'manager')
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Permissions" sub="Decide what managers can do. Super admins can always do everything." />
      <section className="panel overflow-hidden">
        <div className="grid grid-cols-[1fr_96px_96px] border-b border-line bg-paper px-5 py-2.5 text-xs font-medium text-muted">
          <span>Permission</span>
          <span className="text-center">Manager</span>
          <span className="text-center">Super admin</span>
        </div>
        <ul className="divide-y divide-line">
          {PERMS.map((p) => (
            <li key={p.key} className="grid grid-cols-[1fr_96px_96px] items-center px-5 py-3.5">
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-[13px] text-muted">{p.hint}</div>
              </div>
              <div className="flex justify-center">
                <Switch
                  label={`${p.label} for managers`}
                  checked={s.perms[p.key]}
                  onChange={(v) => {
                    a.setPerm(p.key, v)
                    toast(`Managers ${v ? 'can now' : 'can no longer'} ${p.label.toLowerCase()}`)
                  }}
                />
              </div>
              <div className="flex justify-center">
                <Switch label={`${p.label} for super admins`} checked disabled onChange={() => {}} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <h2 className="mb-3 mt-8 text-sm font-semibold">Managers and their branches</h2>
      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-5 py-2.5 font-medium">Manager</th>
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
                      aria-label={`${m.name} manages ${b.name}`}
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
  const tabs: { value: Tab; label: string }[] = [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'hours', label: 'Opening hours' },
    { value: 'departments', label: 'Departments' },
    ...(can('manageBranches') ? [{ value: 'branches' as Tab, label: 'Branches' }] : []),
    { value: 'account', label: 'Account' },
  ]
  const [tab, setTab] = useState<Tab>(tabs.some((t) => t.value === initial) ? (initial as Tab) : 'restaurant')
  const [name, setName] = useState(branch!.name)
  const [address, setAddress] = useState(branch!.address)
  const [opens, setOpens] = useState(branch!.opens)
  const [closes, setCloses] = useState(branch!.closes)
  const [adding, setAdding] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const saveBranch = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    a.saveBranch({ id: branch!.id, name: name.trim(), address, opens, closes })
    toast('Settings saved')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" />
      <div className="mb-6 overflow-x-auto">
        <Segmented label="Settings section" value={tab} onChange={setTab} options={tabs} />
      </div>

      {tab === 'restaurant' && (
        <form onSubmit={saveBranch} className="panel space-y-4 p-6">
          <Field label="Branch name" htmlFor="s-name" error={name.trim() ? undefined : 'Enter a name.'}>
            <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Address" htmlFor="s-addr">
            <input id="s-addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              Save changes
            </Button>
          </div>
        </form>
      )}

      {tab === 'hours' && (
        <form onSubmit={saveBranch} className="panel space-y-4 p-6">
          <p className="text-sm text-muted">When {branch!.name} is open to guests. Shifts can start before opening for prep.</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Opens" htmlFor="s-open">
              <input id="s-open" type="time" className="input" value={opens} onChange={(e) => setOpens(e.target.value)} />
            </Field>
            <Field label="Closes" htmlFor="s-close" hint={closes < opens ? 'Closes after midnight' : undefined}>
              <input id="s-close" type="time" className="input" value={closes} onChange={(e) => setCloses(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              Save hours
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
                  <span className="flex-1 text-sm font-medium">{d}</span>
                  <span className="text-[13px] text-muted">{n} people</span>
                </li>
              )
            })}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[13px] text-muted">Departments show in this order on the schedule: Bar, Service, Kitchen.</p>
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
                <span className="text-[13px] text-muted">{s.employees.filter((e) => e.branchId === b.id).length} people</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => navigate('/permissions')}>
              Assign managers
            </Button>
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add branch
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
              <Badge tone="green">{me?.role === 'super' ? 'Super admin' : 'Manager'}</Badge>
            </div>
            <Button
              className="mt-5"
              onClick={() => {
                a.logout()
                navigate('/login')
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <div className="text-sm font-medium">Reset demo data</div>
              <div className="text-[13px] text-muted">Restore the sample team, shifts and requests.</div>
            </div>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
      )}

      {adding && <AddBranch onClose={() => setAdding(false)} />}
      {confirmReset && (
        <Modal
          title="Reset all demo data?"
          description="Every change you’ve made — shifts, employees, settings — goes back to the sample data."
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  a.reset()
                  setConfirmReset(false)
                  toast('Demo data reset')
                }}
              >
                Reset data
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
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [err, setErr] = useState('')
  return (
    <Modal
      title="Add branch"
      description="You can assign managers to it afterwards."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="branch-form">
            Add branch
          </Button>
        </>
      }
    >
      <form
        id="branch-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return setErr('Enter a name for the branch.')
          a.saveBranch({ name: name.trim(), address: address.trim(), opens: '10:00', closes: '23:00' })
          toast(`${name.trim()} added`)
          onClose()
        }}
      >
        <Field label="Name" htmlFor="b-name" error={err}>
          <input id="b-name" autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverside" />
        </Field>
        <Field label="Address" htmlFor="b-addr" hint="Optional">
          <input id="b-addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
