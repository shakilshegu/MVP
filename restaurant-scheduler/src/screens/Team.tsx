import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Camera, Mail, Pencil, Phone, Plane, Search, Send, UserPlus, Users } from 'lucide-react'
import { useStore } from '../lib/store'
import { navigate, useLoad } from '../lib/hooks'
import { addDays, DAY_SHORT, fmtDay, fmtRange, startOfWeek, todayKey } from '../lib/date'
import { isActive, weekHours } from '../lib/validation'
import { DEPTS, PREFERRED } from '../lib/types'
import type { Dept, Employee } from '../lib/types'
import { Hours } from '../components/assign'
import { Avatar, Badge, Button, cx, DeptTag, EmptyState, ErrorState, Field, Modal, PageHeader, Segmented, Skeleton, toneCls } from '../components/ui'

export function Team({ openAdd }: { openAdd: boolean }) {
  const { s, branch, can } = useStore()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<'All' | Dept>('All')
  const [adding, setAdding] = useState(openAdd)
  const { status, retry } = useLoad('team' + branch!.id)
  const ws = startOfWeek(todayKey())

  const team = s.employees.filter((e) => e.branchId === branch!.id)
  const list = team
    .filter((e) => dept === 'All' || e.dept === dept)
    .filter((e) => {
      const t = q.trim().toLowerCase()
      return !t || e.name.toLowerCase().includes(t) || e.position.toLowerCase().includes(t) || e.email.includes(t)
    })
    .sort((a, b) => DEPTS.indexOf(a.dept) - DEPTS.indexOf(b.dept) || a.name.localeCompare(b.name))

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Team"
        sub={`${team.length} people at ${branch!.name}${team.some((e) => e.status === 'invited') ? ` · ${team.filter((e) => e.status === 'invited').length} invite pending` : ''}`}
        actions={
          can('createEmployees') && (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <UserPlus className="h-4 w-4" /> Add employee
            </Button>
          )
        }
      />

      {team.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search team</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, role or email" className="input pl-9" />
          </label>
          <Segmented label="Department" value={dept} onChange={setDept} options={[{ value: 'All', label: 'All' }, ...DEPTS.map((d) => ({ value: d, label: d }))]} />
        </div>
      )}

      <div className="panel overflow-hidden">
        {status === 'loading' && (
          <div className="divide-y divide-line" aria-busy="true" aria-label="Loading team">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}
        {status === 'error' && <ErrorState what="your team" onRetry={retry} />}
        {status === 'ready' && team.length === 0 && (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No one here yet"
            body={`Add the people who work at ${branch!.name}. They’ll get an email invite to see their shifts.`}
            action={
              can('createEmployees') && (
                <Button variant="primary" onClick={() => setAdding(true)}>
                  <UserPlus className="h-4 w-4" /> Add your first employee
                </Button>
              )
            }
          />
        )}
        {status === 'ready' && team.length > 0 && list.length === 0 && (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No matches"
            body={`Nobody matches “${q}”${dept !== 'All' ? ` in ${dept}` : ''}.`}
            action={
              <Button
                onClick={() => {
                  setQ('')
                  setDept('All')
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
        {status === 'ready' && list.length > 0 && (
          <ul className="divide-y divide-line">
            {list.map((e) => (
              <li key={e.id}>
                <a href={`#/team/${e.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-paper">
                  <Avatar e={e} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{e.name}</span>
                      {e.status === 'invited' && <Badge tone="warn">Invite pending</Badge>}
                    </div>
                    <div className="text-[13px] text-muted">{e.position}</div>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <DeptTag dept={e.dept} />
                  </div>
                  <div className="hidden w-24 text-[13px] text-muted md:block">{e.preferred}</div>
                  <Hours used={weekHours(s, e.id, ws)} max={e.maxHours} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {adding && <EmployeeForm onClose={() => setAdding(false)} />}
    </div>
  )
}

export function EmployeeForm({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const { a, toast } = useStore()
  const [f, setF] = useState({
    name: employee?.name ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    dept: employee?.dept ?? ('Service' as Dept),
    position: employee?.position ?? '',
    maxHours: employee?.maxHours ?? 40,
    preferred: employee?.preferred ?? 'Flexible',
    photo: employee?.photo,
  })
  const [invite, setInvite] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Enter their full name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter an email like name@example.com.'
    if (!f.position.trim()) e.position = 'Enter a role, for example Server.'
    if (!(f.maxHours >= 1 && f.maxHours <= 60)) e.maxHours = 'Use a number between 1 and 60.'
    setErrors(e)
    if (Object.keys(e).length) return
    const saved = a.saveEmployee({
      ...f,
      id: employee?.id,
      name: f.name.trim(),
      position: f.position.trim(),
      availability: employee?.availability ?? [true, true, true, true, true, true, true],
      status: employee?.status ?? (invite ? 'invited' : 'active'),
    })
    toast(employee ? 'Changes saved' : invite ? `Invite sent to ${saved.email}` : `${saved.name} added`)
    onClose()
    if (!employee) navigate(`/team/${saved.id}`)
  }

  const onPhoto = (file?: File) => {
    if (!file) return
    if (file.size > 400_000) {
      setErrors((p) => ({ ...p, photo: 'Pick an image under 400 KB.' }))
      return
    }
    const r = new FileReader()
    r.onload = () => set('photo', r.result as string)
    r.readAsDataURL(file)
  }

  return (
    <Modal
      title={employee ? `Edit ${employee.name.split(' ')[0]}` : 'Add employee'}
      description={employee ? undefined : 'They’ll show up on the schedule right away.'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="emp-form">
            {employee ? 'Save changes' : invite ? (
              <>
                <Send className="h-4 w-4" /> Add and send invite
              </>
            ) : (
              'Add employee'
            )}
          </Button>
        </>
      }
    >
      <form id="emp-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="group relative cursor-pointer">
            <Avatar e={{ name: f.name || '?', dept: f.dept, photo: f.photo }} size={56} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Camera className="h-5 w-5" />
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} aria-label="Upload photo" />
          </label>
          <div className="flex-1">
            <Field label="Full name" htmlFor="f-name" error={errors.name}>
              <input id="f-name" autoFocus className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Maya Robinson" />
            </Field>
            {errors.photo && <p className="mt-1 text-[13px] text-danger">{errors.photo}</p>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="f-email" error={errors.email}>
            <input id="f-email" type="email" className="input" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="maya@example.com" />
          </Field>
          <Field label="Phone" htmlFor="f-phone" hint="Optional">
            <input id="f-phone" type="tel" className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>
        <Field label="Department">
          <Segmented label="Department" value={f.dept} onChange={(v) => set('dept', v)} options={DEPTS.map((d) => ({ value: d, label: d }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Position" htmlFor="f-pos" error={errors.position}>
              <input id="f-pos" className="input" value={f.position} onChange={(e) => set('position', e.target.value)} placeholder="Server, Line cook…" />
            </Field>
          </div>
          <Field label="Max hours / week" htmlFor="f-max" error={errors.maxHours}>
            <input id="f-max" type="number" min={1} max={60} className="input" value={f.maxHours} onChange={(e) => set('maxHours', Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Preferred shifts" htmlFor="f-pref">
          <select id="f-pref" className="input" value={f.preferred} onChange={(e) => set('preferred', e.target.value as Employee['preferred'])}>
            {PREFERRED.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        {!employee && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-paper p-3 text-sm">
            <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} className="mt-0.5 h-4 w-4 accent-forest" />
            <span>
              <span className="font-medium">Email an invite</span>
              <span className="block text-[13px] text-muted">They can sign in to see their shifts and set their availability.</span>
            </span>
          </label>
        )}
      </form>
    </Modal>
  )
}

export function EmployeeProfile({ id }: { id: string }) {
  const { s, can, toast, a } = useStore()
  const [editing, setEditing] = useState(false)
  const e = s.employees.find((x) => x.id === id)
  if (!e) {
    return (
      <div className="panel mx-auto max-w-md">
        <EmptyState icon={<Users className="h-5 w-5" />} title="Employee not found" body="They may have been removed from this branch." action={<Button onClick={() => navigate('/team')}>Back to team</Button>} />
      </div>
    )
  }
  const today = todayKey()
  const ws = startOfWeek(today)
  const shifts = s.assignments.filter((x) => x.employeeId === e.id && isActive(x) && x.date >= ws && x.date <= addDays(ws, 6)).sort((x, y) => x.date.localeCompare(y.date))
  const leaves = s.leaves.filter((l) => l.employeeId === e.id && l.to >= today && l.status !== 'declined')

  return (
    <div className="mx-auto max-w-4xl">
      <a href="#/team" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Team
      </a>
      <div className="panel flex flex-wrap items-center gap-5 p-6">
        <Avatar e={e} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl text-forest">{e.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
            {e.position}
            <DeptTag dept={e.dept} />
            {e.status === 'invited' && <Badge tone="warn">Invite pending</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {e.status === 'invited' && (
            <Button onClick={() => toast(`Invite resent to ${e.email}`)}>
              <Send className="h-4 w-4" /> Resend invite
            </Button>
          )}
          {can('createEmployees') && (
            <Button onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <section className="panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold">This week</h2>
            <Hours used={weekHours(s, e.id, ws)} max={e.maxHours} />
          </div>
          {shifts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No shifts this week.</p>
          ) : (
            <ul className="divide-y divide-line">
              {shifts.map((x) => {
                const t = s.templates.find((y) => y.id === x.templateId)!
                return (
                  <li key={x.id} className={cx('flex items-center gap-4 px-5 py-3', x.date < today && 'opacity-55')}>
                    <div className="w-24 text-sm font-medium">{fmtDay(x.date)}</div>
                    <span className={cx('rounded-md px-2 py-0.5 text-xs font-medium', toneCls[t.tone])}>{t.name}</span>
                    <span className="text-sm text-muted">
                      {t.start}–{t.end}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      {x.state === 'added' && <Badge tone="green">Unpublished</Badge>}
                      <DeptTag dept={x.dept} />
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="text-sm font-semibold">Contact</h2>
            <a href={`mailto:${e.email}`} className="mt-3 flex items-center gap-2 text-sm text-forest hover:underline">
              <Mail className="h-4 w-4" /> {e.email}
            </a>
            {e.phone && (
              <a href={`tel:${e.phone.replace(/\s/g, '')}`} className="mt-2 flex items-center gap-2 text-sm text-forest hover:underline">
                <Phone className="h-4 w-4" /> {e.phone}
              </a>
            )}
          </section>
          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Availability</h2>
              <a href="#/availability" className="text-[13px] font-medium text-forest hover:underline">
                Edit
              </a>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {DAY_SHORT.map((d, i) => (
                <button
                  key={d}
                  onClick={() => a.setAvailability(e.id, i, !e.availability[i])}
                  aria-pressed={e.availability[i]}
                  aria-label={`${d}: ${e.availability[i] ? 'available' : 'unavailable'}`}
                  className={cx(
                    'rounded-md py-1.5 text-center text-[11px] font-medium',
                    e.availability[i] ? 'bg-forest-50 text-forest' : 'bg-paper text-muted line-through',
                  )}
                >
                  {d.slice(0, 2)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-muted">
              Prefers {e.preferred.toLowerCase()} · max {e.maxHours}h a week
            </p>
          </section>
          <section className="panel p-5">
            <h2 className="text-sm font-semibold">Upcoming leave</h2>
            {leaves.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">None booked.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {leaves.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 text-sm">
                    <Plane className="h-4 w-4 text-muted" />
                    {fmtRange(l.from, l.to)}
                    <span className="ml-auto">{l.status === 'pending' ? <Badge tone="warn">Pending</Badge> : <Badge tone="green">Approved</Badge>}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      {editing && <EmployeeForm employee={e} onClose={() => setEditing(false)} />}
    </div>
  )
}
