import { useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronRight, Eye, EyeOff, LogOut, Plane, Store, Users } from 'lucide-react'
import { branchChanges, useStore } from '../lib/store'
import { navigate } from '../lib/hooks'
import { fmtLong, todayKey } from '../lib/date'
import { isActive } from '../lib/validation'
import { useT } from '../i18n'
import type { MsgKey } from '../i18n'
import { LanguageMenu } from '../components/LanguageSwitch'
import { Button, cx, Field } from '../components/ui'

const BARS = [
  ['morning', 6, 14],
  ['day', 10, 18],
  ['evening', 16, 23],
  ['night', 22, 26],
  ['day', 11, 17],
  ['evening', 17, 24],
  ['morning', 7, 13],
] as const

export function Login() {
  const { a } = useStore()
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<MsgKey | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !pw) {
      setError('auth.missing')
      return
    }
    const err = a.login(email)
    setError(err)
    if (!err) navigate('/schedule')
  }

  const demo = (addr: string) => {
    setEmail(addr)
    setPw('demo-password')
    setError(null)
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-forest p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white font-serif text-2xl leading-none text-forest">R</span>
          <span className="text-lg font-semibold">Rota</span>
        </div>
        <div aria-hidden className="space-y-3">
          {BARS.map(([tone, s, e], i) => (
            <div key={i} className="relative h-7">
              <div
                className={cx('absolute inset-y-0 rounded-md', { morning: 'bg-morning', day: 'bg-day', evening: 'bg-evening', night: 'bg-night' }[tone])}
                style={{ left: `${((s - 5) / 22) * 100}%`, width: `${((e - s) / 22) * 100}%`, opacity: 0.92 - i * 0.06 }}
              />
            </div>
          ))}
          <div className="flex justify-between pt-1 text-xs text-white/50">
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>00:00</span>
          </div>
        </div>
        <p className="max-w-md font-serif text-4xl leading-tight">{t('auth.tagline')}</p>
      </div>

      <div className="relative flex items-center justify-center bg-paper px-6 py-12">
        <LanguageMenu className="absolute right-4 top-4" />
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-4xl text-forest">{t('auth.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('auth.subtitle')}</p>
          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Field label={t('auth.email')} htmlFor="email">
              <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Field>
            <Field label={t('auth.password')} htmlFor="pw">
              <div className="relative">
                <input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" className="input pr-10" value={pw} onChange={(e) => setPw(e.target.value)} />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={t(show ? 'auth.hidePassword' : 'auth.showPassword')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-[13px] text-danger">
                {t(error)}
              </p>
            )}
            <Button type="submit" variant="primary" className="w-full">
              {t('auth.title')}
            </Button>
          </form>
          <div className="mt-8 rounded-xl border border-dashed border-sage-dark p-4">
            <div className="text-xs font-medium text-muted">{t('auth.demoAccounts')}</div>
            <div className="mt-2 grid gap-2">
              <button onClick={() => demo('priya@harborhouse.co')} className="rounded-lg bg-white px-3 py-2 text-left text-sm ring-1 ring-line hover:ring-forest/40">
                <span className="font-medium">Priya Raman</span> <span className="text-muted">· {t('auth.demoManager')}</span>
              </button>
              <button onClick={() => demo('daniel@harborhouse.co')} className="rounded-lg bg-white px-3 py-2 text-left text-sm ring-1 ring-line hover:ring-forest/40">
                <span className="font-medium">Daniel Okafor</span> <span className="text-muted">· {t('auth.demoSuper')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SelectBranch() {
  const { s, a, me, myBranches } = useStore()
  const { t } = useT()
  const today = todayKey()
  return (
    <div className="min-h-full bg-paper px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest font-serif text-2xl leading-none text-white">R</span>
          <div className="flex items-center gap-1">
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
          </div>
        </div>
        <h1 className="mt-10 font-serif text-4xl text-forest">{t('branchPick.title', { name: me?.name.split(' ')[0] ?? '' })}</h1>
        <p className="mt-2 text-sm text-muted">{t('branchPick.sub', { date: fmtLong(today) })}</p>
        <ul className="mt-8 space-y-3">
          {myBranches.map((b) => {
            const team = s.employees.filter((e) => e.branchId === b.id)
            const ids = new Set(team.map((e) => e.id))
            const onToday = new Set(s.assignments.filter((x) => x.branchId === b.id && x.date === today && isActive(x)).map((x) => x.employeeId)).size
            const leave = s.leaves.filter((l) => l.status === 'pending' && ids.has(l.employeeId)).length
            const drafts = branchChanges(s, b.id).length
            return (
              <li key={b.id}>
                <button
                  onClick={() => {
                    a.selectBranch(b.id)
                    navigate('/dashboard')
                  }}
                  className="panel flex w-full items-center gap-4 p-5 text-left transition-shadow hover:shadow-md"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest">
                    <Store className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{b.name}</span>
                    <span className="block truncate text-[13px] text-muted">{b.address}</span>
                    <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {team.length ? t('branchPick.workingToday', { count: onToday }) : t('branchPick.noTeam')}
                      </span>
                      {leave > 0 && (
                        <span className="flex items-center gap-1 text-bark">
                          <Plane className="h-3.5 w-3.5" /> {t('branchPick.leaveRequests', { count: leave })}
                        </span>
                      )}
                      {drafts > 0 && <span className="text-forest">{t('shell.unpublished', { count: drafts })}</span>}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
