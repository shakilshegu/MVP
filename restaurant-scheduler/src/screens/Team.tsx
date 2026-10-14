import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Camera, Check, ClipboardList, Mail, Pencil, Phone, Plane, Search, Send, UserPlus, Users } from 'lucide-react'
import { useStore } from '../lib/store'
import { navigate, useLoad } from '../lib/hooks'
import { addDays, dayShort, fmtDay, fmtRange, startOfWeek, todayKey, WEEK } from '../lib/date'
import { useT } from '../i18n'
import { deptName, money } from '../i18n/format'
import { EarningsHistory } from '../components/earnings'
import { isActive, weekHours } from '../lib/validation'
import { PREFERRED } from '../lib/types'
import { EMPLOYEE_COLORS } from '../lib/seed'
import type { Dept, Employee } from '../lib/types'
import { Hours } from '../components/assign'
import { Avatar, Badge, Button, cx, DeptTag, EmptyState, ErrorState, Field, Modal, PageHeader, Segmented, Skeleton, toneCls } from '../components/ui'

export function Team({ openAdd }: { openAdd: boolean }) {
  const { s, branch, can, depts } = useStore()
  const { t } = useT()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<'All' | Dept>('All')
  const [adding, setAdding] = useState(openAdd)
  const { status, retry } = useLoad('team' + branch!.id)
  const ws = startOfWeek(todayKey())

  const team = s.employees.filter((e) => e.branchId === branch!.id)
  const list = team
    .filter((e) => dept === 'All' || e.skills.includes(dept))
    .filter((e) => {
      const t = q.trim().toLowerCase()
      return !t || e.name.toLowerCase().includes(t) || e.position.toLowerCase().includes(t) || e.email.includes(t)
    })
    .sort((a, b) => depts.findIndex((d) => d.id === a.dept) - depts.findIndex((d) => d.id === b.dept) || a.name.localeCompare(b.name))

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t('team.title')}
        sub={[
          t('team.sub', { count: team.length, branch: branch!.name }),
          team.some((e) => e.status === 'invited') ? t('team.invitesPending', { count: team.filter((e) => e.status === 'invited').length }) : '',
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          can('createEmployees') && (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <UserPlus className="h-4 w-4" /> {t('team.add')}
            </Button>
          )
        }
      />

      {team.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">{t('assign.searchTeam')}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('team.searchPlaceholder')} className="input pl-9" />
          </label>
          <Segmented label={t('common.department')} value={dept} onChange={setDept} options={[{ value: 'All', label: t('common.all') }, ...depts.map((d) => ({ value: d.id, label: d.name }))]} />
        </div>
      )}

      <div className="panel overflow-hidden">
        {status === 'loading' && (
          <div className="divide-y divide-line" aria-busy="true" aria-label={t('team.loading')}>
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
        {status === 'error' && <ErrorState what={t('team.errorWhat')} onRetry={retry} />}
        {status === 'ready' && team.length === 0 && (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={t('team.emptyTitle')}
            body={t('team.emptyBody', { branch: branch!.name })}
            action={
              can('createEmployees') && (
                <Button variant="primary" onClick={() => setAdding(true)}>
                  <UserPlus className="h-4 w-4" /> {t('team.addFirst')}
                </Button>
              )
            }
          />
        )}
        {status === 'ready' && team.length > 0 && list.length === 0 && (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title={t('team.noMatches')}
            body={dept !== 'All' ? t('team.noMatchesIn', { q, dept: deptName(s, dept) }) : t('team.noMatchesBody', { q })}
            action={
              <Button
                onClick={() => {
                  setQ('')
                  setDept('All')
                }}
              >
                {t('team.clearFilters')}
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
                      {e.status === 'invited' && <Badge tone="warn">{t('team.invitePending')}</Badge>}
                    </div>
                    <div className="text-[13px] text-muted">{e.position}</div>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <DeptTag dept={e.dept} />
                  </div>
                  <div className="hidden w-24 text-[13px] text-muted md:block">{t(`preferred.${e.preferred}`)}</div>
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
  const { a, s, toast, depts, canSeePay, company } = useStore()
  const { t } = useT()
  const [f, setF] = useState({
    name: employee?.name ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    skills: employee?.skills ?? ([] as Dept[]),
    dept: employee?.dept ?? '',
    position: employee?.position ?? '',
    maxHours: employee?.maxHours ?? 40,
    hourlyRate: employee?.hourlyRate ?? 0,
    preferred: employee?.preferred ?? 'Flexible',
    color: employee?.color ?? EMPLOYEE_COLORS[s.employees.length % EMPLOYEE_COLORS.length],
    checklistId: employee?.checklistId ?? null,
    photo: employee?.photo,
  })
  const [invite, setInvite] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  const main = f.skills.includes(f.dept) ? f.dept : f.skills[0] ?? ''
  const checklist = s.checklists.find((c) => c.id === f.checklistId)
  const currency = company?.currency ?? 'EUR'

  const toggleSkill = (id: Dept) =>
    setF((p) => {
      const skills = p.skills.includes(id) ? p.skills.filter((x) => x !== id) : [...p.skills, id]
      // A new person's first department suggests a matching checklist.
      const suggested = !employee && !p.checklistId ? s.checklists.find((c) => c.id.endsWith(`-cl-${id.split('-').pop()}`))?.id ?? null : p.checklistId
      return { ...p, skills, checklistId: suggested }
    })

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = t('employeeForm.errName')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = t('employeeForm.errEmail')
    else if (!a.isEmailFree(f.email, employee?.id)) e.email = t('employeeForm.errEmailTaken')
    if (!f.skills.length) e.skills = t('employeeForm.errSkills')
    if (!f.position.trim()) e.position = t('employeeForm.errPosition')
    if (!(f.maxHours >= 1 && f.maxHours <= 60)) e.maxHours = t('employeeForm.errMax')
    if (canSeePay && !(f.hourlyRate > 0)) e.hourlyRate = t('employeeForm.errHourly')
    setErrors(e)
    if (Object.keys(e).length) return
    const saved = a.saveEmployee({
      ...f,
      id: employee?.id,
      name: f.name.trim(),
      email: f.email.trim(),
      position: f.position.trim(),
      dept: main,
      availability: employee?.availability ?? [true, true, true, true, true, true, true],
      status: employee?.status ?? (invite ? 'invited' : 'active'),
    })
    toast(employee ? t('employeeForm.saved') : invite ? t('employeeForm.inviteSent', { email: saved.email }) : t('employeeForm.added', { name: saved.name }))
    onClose()
    if (!employee) navigate(`/team/${saved.id}`)
  }

  const onPhoto = (file?: File) => {
    if (!file) return
    if (file.size > 400_000) {
      setErrors((p) => ({ ...p, photo: t('employeeForm.errPhoto') }))
      return
    }
    const r = new FileReader()
    r.onload = () => set('photo', r.result as string)
    r.readAsDataURL(file)
  }

  return (
    <Modal
      width="max-w-2xl"
      title={employee ? t('employeeForm.editTitle', { name: employee.name.split(' ')[0] }) : t('employeeForm.addTitle')}
      description={employee ? undefined : t('employeeForm.addDesc')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="emp-form">
            {employee ? t('common.save') : invite ? (
              <>
                <Send className="h-4 w-4" /> {t('employeeForm.addAndInvite')}
              </>
            ) : (
              t('employeeForm.addEmployee')
            )}
          </Button>
        </>
      }
    >
      <form id="emp-form" onSubmit={submit} noValidate className="space-y-5">
        <div className="flex items-center gap-4">
          <label className="group relative cursor-pointer">
            <Avatar e={{ name: f.name || '?', color: f.color, photo: f.photo }} size={56} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Camera className="h-5 w-5" />
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} aria-label={t('employeeForm.uploadPhoto')} />
          </label>
          <div className="flex-1">
            <Field label={t('employeeForm.fullName')} htmlFor="f-name" error={errors.name}>
              <input id="f-name" autoFocus className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={t('employeeForm.namePlaceholder')} />
            </Field>
            {errors.photo && <p className="mt-1 text-[13px] text-danger">{errors.photo}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('employeeForm.email')} htmlFor="f-email" error={errors.email}>
            <input id="f-email" type="email" className="input" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder={t('employeeForm.emailPlaceholder')} />
          </Field>
          <Field label={t('employeeForm.phone')} htmlFor="f-phone" hint={t('common.optional')}>
            <input id="f-phone" type="tel" className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>

        <Field label={t('employeeForm.skills')} error={errors.skills} hint={t('employeeForm.skillsHint')}>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('employeeForm.skills')}>
            {depts.map((d) => {
              const on = f.skills.includes(d.id)
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSkill(d.id)}
                  className={cx(
                    'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
                    on ? 'border-forest bg-forest-50 text-forest' : 'border-line bg-white text-muted hover:border-sage-dark',
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                  {on && <Check className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('employeeForm.position')} htmlFor="f-pos" error={errors.position}>
            <input id="f-pos" className="input" value={f.position} onChange={(e) => set('position', e.target.value)} placeholder={t('employeeForm.positionPlaceholder')} />
          </Field>
          {f.skills.length > 1 && (
            <Field label={t('employeeForm.mainDept')} htmlFor="f-main">
              <select id="f-main" className="input" value={main} onChange={(e) => set('dept', e.target.value)}>
                {f.skills.map((id) => (
                  <option key={id} value={id}>
                    {deptName(s, id)}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('employeeForm.maxHours')} htmlFor="f-max" error={errors.maxHours}>
            <input id="f-max" type="number" min={1} max={60} className="input" value={f.maxHours} onChange={(e) => set('maxHours', Number(e.target.value))} />
          </Field>
          {canSeePay && (
            <Field label={t('employeeForm.hourly')} htmlFor="f-rate" error={errors.hourlyRate} hint={t('employeeForm.hourlyHint')}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">{currency === 'EUR' ? '€' : '₹'}</span>
                <input id="f-rate" type="number" min={0} step={0.5} className="input pl-7" value={f.hourlyRate || ''} onChange={(e) => set('hourlyRate', Number(e.target.value))} />
              </div>
            </Field>
          )}
          <Field label={t('employeeForm.preferred')} htmlFor="f-pref">
            <select id="f-pref" className="input" value={f.preferred} onChange={(e) => set('preferred', e.target.value as Employee['preferred'])}>
              {PREFERRED.map((p) => (
                <option key={p} value={p}>
                  {t(`preferred.${p}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t('employeeForm.color')}>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('employeeForm.color')}>
            {EMPLOYEE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={f.color === c}
                aria-label={c}
                onClick={() => set('color', c)}
                className={cx('h-8 w-8 rounded-full ring-offset-2 transition-shadow', f.color === c && 'ring-2 ring-ink')}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>

        <Field label={t('employeeForm.checklist')} htmlFor="f-cl" hint={t('employeeForm.checklistHint')}>
          <select id="f-cl" className="input" value={f.checklistId ?? ''} onChange={(e) => set('checklistId', e.target.value || null)}>
            <option value="">{t('employeeForm.checklistNone')}</option>
            {s.checklists.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {checklist && (
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-paper">
              {checklist.items.map((i) => (
                <li key={i.id} className="flex gap-3 px-3 py-2.5">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-sage-dark bg-white" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium">{i.title}</span>
                    {i.detail && <span className="block text-[13px] text-muted">{i.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Field>

        {!employee && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-paper p-3 text-sm">
            <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} className="mt-0.5 h-4 w-4 accent-forest" />
            <span>
              <span className="font-medium">{t('employeeForm.invite')}</span>
              <span className="block text-[13px] text-muted">{t('employeeForm.inviteHint')}</span>
            </span>
          </label>
        )}
      </form>
    </Modal>
  )
}

export function EmployeeProfile({ id }: { id: string }) {
  const { s, can, toast, a, canSeePay, company } = useStore()
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const e = s.employees.find((x) => x.id === id)
  if (!e) {
    return (
      <div className="panel mx-auto max-w-md">
        <EmptyState icon={<Users className="h-5 w-5" />} title={t('profile.notFound')} body={t('profile.notFoundBody')} action={<Button onClick={() => navigate('/team')}>{t('profile.backToTeam')}</Button>} />
      </div>
    )
  }
  const today = todayKey()
  const ws = startOfWeek(today)
  const shifts = s.assignments.filter((x) => x.employeeId === e.id && isActive(x) && x.date >= ws && x.date <= addDays(ws, 6)).sort((x, y) => x.date.localeCompare(y.date))
  const leaves = s.leaves.filter((l) => l.employeeId === e.id && l.to >= today && l.status !== 'declined')
  const checklist = s.checklists.find((c) => c.id === e.checklistId)

  return (
    <div className="mx-auto max-w-4xl">
      <a href="#/team" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {t('team.title')}
      </a>
      <div className="panel flex flex-wrap items-center gap-5 p-6">
        <Avatar e={e} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl text-forest">{e.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
            {e.position}
            <DeptTag dept={e.dept} />
            {e.status === 'invited' && <Badge tone="warn">{t('team.invitePending')}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {e.status === 'invited' && (
            <Button onClick={() => toast(t('profile.resent', { email: e.email }))}>
              <Send className="h-4 w-4" /> {t('profile.resendInvite')}
            </Button>
          )}
          {can('createEmployees') && (
            <Button onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <section className="panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold">{t('profile.thisWeek')}</h2>
            <Hours used={weekHours(s, e.id, ws)} max={e.maxHours} />
          </div>
          {shifts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t('profile.noShifts')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {shifts.map((x) => {
                const tpl = s.templates.find((y) => y.id === x.templateId)!
                return (
                  <li key={x.id} className={cx('px-5 py-3', x.date < today && 'opacity-55')}>
                    <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{fmtDay(x.date)}</div>
                    <span className={cx('rounded-md px-2 py-0.5 text-xs font-medium', toneCls[tpl.tone])}>{tpl.name}</span>
                    <span className="text-sm text-muted">
                      {tpl.start}–{tpl.end}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      {x.state === 'added' && <Badge tone="green">{t('profile.unpublished')}</Badge>}
                      <DeptTag dept={x.dept} />
                    </span>
                    </div>
                    {!!x.tasks?.length && (
                      <ul className="ml-28 mt-1.5 space-y-0.5">
                        {x.tasks.map((task) => (
                          <li key={task.id} className={cx('flex items-center gap-2 text-[13px]', task.done ? 'text-muted line-through' : 'text-ink/80')}>
                            <ClipboardList className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                            {task.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6 md:row-span-2">
          <section className="panel p-5">
            <h2 className="text-sm font-semibold">{t('profile.skills')}</h2>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {e.skills.map((d) => (
                <DeptTag key={d} dept={d} />
              ))}
            </div>
            {canSeePay && (
              <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3 text-sm">
                <span className="text-muted">{t('profile.pay')}</span>
                <span className="font-semibold">
                  {money(e.hourlyRate, company?.currency ?? 'EUR')}
                </span>
              </div>
            )}
            {checklist && (
              <div className="mt-4 border-t border-line pt-3">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <ClipboardList className="h-4 w-4" /> {t('profile.checklist')}
                </div>
                <div className="mt-1 text-sm font-medium">{checklist.name}</div>
                <ul className="mt-2 space-y-1">
                  {checklist.items.map((i) => (
                    <li key={i.id} className="text-[13px] text-ink/80">
                      · {i.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section className="panel p-5">
            <h2 className="text-sm font-semibold">{t('profile.contact')}</h2>
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
              <h2 className="text-sm font-semibold">{t('profile.availability')}</h2>
              <a href="#/availability" className="text-[13px] font-medium text-forest hover:underline">
                {t('common.edit')}
              </a>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {WEEK.map((i) => (
                <button
                  key={i}
                  onClick={() => a.setAvailability(e.id, i, !e.availability[i])}
                  aria-pressed={e.availability[i]}
                  aria-label={t('profile.dayState', { day: dayShort(i), state: t(e.availability[i] ? 'common.available' : 'common.unavailable') })}
                  className={cx(
                    'rounded-md py-1.5 text-center text-[11px] font-medium',
                    e.availability[i] ? 'bg-forest-50 text-forest' : 'bg-paper text-muted line-through',
                  )}
                >
                  {dayShort(i).slice(0, 2)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-muted">
              {t('profile.prefers', { pref: t(`preferred.${e.preferred}`), max: e.maxHours })}
            </p>
          </section>
          <section className="panel p-5">
            <h2 className="text-sm font-semibold">{t('profile.upcomingLeave')}</h2>
            {leaves.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">{t('profile.noneBooked')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {leaves.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 text-sm">
                    <Plane className="h-4 w-4 text-muted" />
                    {fmtRange(l.from, l.to)}
                    <span className="ml-auto">{l.status === 'pending' ? <Badge tone="warn">{t('profile.pending')}</Badge> : <Badge tone="green">{t('profile.approved')}</Badge>}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <EarningsHistory e={e} />
      </div>
      {editing && <EmployeeForm employee={e} onClose={() => setEditing(false)} />}
    </div>
  )
}
