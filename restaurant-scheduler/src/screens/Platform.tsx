import { useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, ChevronRight, LogOut, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { navigate } from '../lib/hooks'
import { fmt } from '../lib/date'
import { cityLabel, GERMAN_CITIES } from '../lib/weather'
import { useT } from '../i18n'
import { LanguageMenu } from '../components/LanguageSwitch'
import { Button, Field, Modal, PageHeader } from '../components/ui'

/** Platform owner's home: every company on Rota, and a way to add one. */
export function Platform() {
  const { platform, a, me } = useStore()
  const { t } = useT()
  const [adding, setAdding] = useState(false)

  return (
    <div className="min-h-full bg-paper">
      <header className="flex h-16 items-center gap-3 border-b border-line bg-white px-4 md:px-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest font-serif text-xl leading-none text-white">R</span>
        <span className="text-[15px] font-semibold text-forest">Rota</span>
        <span className="rounded-full bg-forest-50 px-2 py-0.5 text-xs font-medium text-forest">{t('role.owner')}</span>
        <div className="flex-1" />
        <span className="hidden text-sm text-muted sm:inline">{me?.name}</span>
        <LanguageMenu />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            a.logout()
            navigate('/login')
          }}
        >
          <LogOut className="h-4 w-4" /> {t('common.signOut')}
        </Button>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <PageHeader
          title={t('platform.title')}
          sub={t('platform.sub')}
          actions={
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> {t('platform.add')}
            </Button>
          }
        />
        <ul className="space-y-3">
          {platform.map(({ company, branches, staff, admins }) => (
            <li key={company.id}>
              <button
                onClick={() => {
                  a.selectCompany(company.id)
                  navigate('/dashboard')
                }}
                className="panel flex w-full items-center gap-4 p-5 text-left transition-shadow hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest">
                  <Building2 className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{company.name}</span>
                  <span className="mt-1 block text-[13px] text-muted">
                    {t('platform.branches', { count: branches })} · {t('platform.staff', { count: staff })} ·{' '}
                    {admins.length ? t('platform.admin', { names: admins.map((m) => m.name).join(', ') }) : t('platform.noAdmin')}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted/80">
                    {t('platform.since', { date: fmt(company.createdAt.slice(0, 10), { month: 'long', year: 'numeric' }) })}
                  </span>
                </span>
                <span className="hidden text-sm font-medium text-forest sm:inline">{t('platform.open')}</span>
                <ChevronRight className="h-5 w-5 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </main>

      {adding && <AddCompany onClose={() => setAdding(false)} />}
    </div>
  )
}

function AddCompany({ onClose }: { onClose: () => void }) {
  const { a, toast } = useStore()
  const { t, locale } = useT()
  const [f, setF] = useState({ name: '', branch: '', city: 'Berlin', adminName: '', adminEmail: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!f.name.trim()) err.name = t('platform.errCompany')
    if (!f.branch.trim()) err.branch = t('platform.errBranch')
    if (!f.adminName.trim()) err.adminName = t('platform.errAdmin')
    if (!/^\S+@\S+\.\S+$/.test(f.adminEmail)) err.adminEmail = t('platform.errEmail')
    setErrors(err)
    if (Object.keys(err).length) return
    const result = a.addCompany(f)
    if (typeof result === 'string') {
      setErrors({ adminEmail: t(result) })
      return
    }
    toast(t('platform.created', { name: result.name, email: f.adminEmail.trim() }))
    onClose()
  }

  return (
    <Modal
      title={t('platform.add')}
      description={t('platform.addDesc')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="company-form">
            {t('platform.create')}
          </Button>
        </>
      }
    >
      <form id="company-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('platform.company')} htmlFor="c-name" error={errors.name}>
          <input id="c-name" autoFocus className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={t('platform.companyPlaceholder')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('platform.firstBranch')} htmlFor="c-branch" error={errors.branch}>
            <input id="c-branch" className="input" value={f.branch} onChange={(e) => set('branch', e.target.value)} placeholder={t('platform.branchPlaceholder')} />
          </Field>
          <Field label={t('settings.city')} htmlFor="c-city">
            <select id="c-city" className="input" value={f.city} onChange={(e) => set('city', e.target.value)}>
              {GERMAN_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {cityLabel(c.name, locale)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('platform.adminName')} htmlFor="c-admin" error={errors.adminName}>
            <input id="c-admin" className="input" value={f.adminName} onChange={(e) => set('adminName', e.target.value)} />
          </Field>
          <Field label={t('platform.adminEmail')} htmlFor="c-email" error={errors.adminEmail}>
            <input id="c-email" type="email" className="input" value={f.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

