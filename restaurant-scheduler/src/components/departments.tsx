import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { EMPLOYEE_COLORS } from '../lib/seed'
import { useT } from '../i18n'
import { Button, IconButton, Switch } from './ui'

/** Settings → Departments: add, rename, recolour, reorder and remove departments (CR-09). */
export function DepartmentsPanel() {
  const { s, a, me, depts, toast } = useStore()
  const { t } = useT()
  const admin = me != null && me.role !== 'manager'
  const [name, setName] = useState('')
  const nextColor = EMPLOYEE_COLORS.find((c) => !depts.some((d) => d.color === c)) ?? EMPLOYEE_COLORS[0]

  const add = () => {
    if (!name.trim()) return
    a.saveDepartment({ name: name.trim(), color: nextColor, needsLeader: false })
    setName('')
  }

  return (
    <div className="panel">
      <p className="border-b border-line px-5 py-3 text-[13px] text-muted">{t('settings.deptIntro')}</p>
      <ul className="divide-y divide-line">
        {depts.map((d, i) => {
          const people = s.employees.filter((e) => e.skills.includes(d.id)).length
          const inUse = a.departmentUse(d.id)
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <label className="relative h-7 w-7 shrink-0 cursor-pointer rounded-full ring-2 ring-white ring-offset-1 ring-offset-line" style={{ background: d.color }}>
                <span className="sr-only">{t('settings.deptColour', { name: d.name })}</span>
                <input
                  type="color"
                  disabled={!admin}
                  value={d.color}
                  onChange={(e) => a.saveDepartment({ ...d, color: e.target.value })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
                />
              </label>
              <input
                aria-label={t('settings.deptRename', { name: d.name })}
                disabled={!admin}
                defaultValue={d.name}
                onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== d.name && a.saveDepartment({ ...d, name: e.target.value.trim() })}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="input h-9 min-w-[140px] flex-1 border-transparent bg-transparent px-2 font-medium hover:border-line disabled:hover:border-transparent"
              />
              <span className="w-24 text-[13px] text-muted">{t('common.people', { count: people })}</span>
              <div className="flex items-center gap-2.5 text-[13px] text-muted">
                <Switch label={t('settings.deptNeedsLeader')} checked={d.needsLeader} disabled={!admin} onChange={(v) => a.saveDepartment({ ...d, needsLeader: v })} />
                <span className="hidden whitespace-nowrap sm:inline" aria-hidden>
                  {t('settings.deptNeedsLeader')}
                </span>
              </div>
              {admin && (
                <span className="flex items-center">
                  <IconButton label={t('settings.deptUp', { name: d.name })} disabled={i === 0} onClick={() => a.moveDepartment(d.id, -1)} className="disabled:opacity-30">
                    <ChevronUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton label={t('settings.deptDown', { name: d.name })} disabled={i === depts.length - 1} onClick={() => a.moveDepartment(d.id, 1)} className="disabled:opacity-30">
                    <ChevronDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={inUse ? t('settings.deptInUse', { count: inUse }) : t('settings.deptDelete', { name: d.name })}
                    disabled={inUse > 0}
                    onClick={() => {
                      a.deleteDepartment(d.id)
                      toast(t('settings.deptDeleted', { name: d.name }))
                    }}
                    className="hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {admin && (
        <form
          className="flex gap-2 border-t border-line px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <span className="mt-1.5 h-7 w-7 shrink-0 rounded-full" style={{ background: nextColor }} aria-hidden />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('settings.deptPlaceholder')} aria-label={t('settings.deptAdd')} className="input flex-1" />
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            <Plus className="h-4 w-4" /> {t('settings.deptAdd')}
          </Button>
        </form>
      )}
    </div>
  )
}
