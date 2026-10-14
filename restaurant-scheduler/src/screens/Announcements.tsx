import { useState } from 'react'
import type { FormEvent } from 'react'
import { Megaphone, Pencil, Plus, Send, Trash2, UserPlus } from 'lucide-react'
import { useStore } from '../lib/store'
import { addDays, fmt, fmtLong, fromKey, relTime, todayKey } from '../lib/date'
import type { Announcement, Dept } from '../lib/types'
import { useT } from '../i18n'
import { deptName } from '../i18n/format'
import { Badge, Button, cx, DeptDot, EmptyState, Field, IconButton, Modal, PageHeader } from '../components/ui'

/** Special occasions staff should know about, e.g. a private party (CR-05). */
export function Announcements() {
  const { s, a, branch, can, toast } = useStore()
  const { t } = useT()
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null)
  const [removing, setRemoving] = useState<Announcement | null>(null)
  const [showPast, setShowPast] = useState(false)
  const editable = can('editShifts')
  const today = todayKey()
  const mine = s.announcements.filter((x) => x.branchId === branch!.id)
  const upcoming = mine.filter((x) => x.date >= today).sort((x, y) => x.date.localeCompare(y.date) || (x.start ?? '').localeCompare(y.start ?? ''))
  const past = mine.filter((x) => x.date < today).sort((x, y) => y.date.localeCompare(x.date))

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t('announce.title')}
        sub={t('announce.sub', { branch: branch!.name })}
        actions={
          editable && (
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> {t('announce.new')}
            </Button>
          )
        }
      />
      {upcoming.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Megaphone className="h-5 w-5" />}
            title={t('announce.emptyTitle')}
            body={t('announce.emptyBody')}
            action={editable && <Button onClick={() => setEditing('new')}>{t('announce.new')}</Button>}
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((x) => (
            <Card key={x.id} x={x} editable={editable} onEdit={() => setEditing(x)} onDelete={() => setRemoving(x)} />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowPast(!showPast)} className="text-sm font-medium text-muted hover:text-ink">
            {showPast ? t('announce.hidePast') : t('announce.showPast', { count: past.length })}
          </button>
          {showPast && (
            <ul className="mt-3 space-y-3 opacity-70">
              {past.map((x) => (
                <Card key={x.id} x={x} editable={false} onEdit={() => {}} onDelete={() => {}} />
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && <AnnouncementForm current={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {removing && (
        <Modal
          title={t('announce.deleteTitle')}
          description={t('announce.deleteBody', { title: removing.title })}
          onClose={() => setRemoving(null)}
          footer={
            <>
              <Button onClick={() => setRemoving(null)}>{t('common.cancel')}</Button>
              <Button
                variant="danger"
                onClick={() => {
                  a.deleteAnnouncement(removing.id)
                  toast(t('announce.deleted', { title: removing.title }))
                  setRemoving(null)
                }}
              >
                {t('announce.delete')}
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}

function Card({ x, editable, onEdit, onDelete }: { x: Announcement; editable: boolean; onEdit: () => void; onDelete: () => void }) {
  const { s } = useStore()
  const { t } = useT()
  const d = fromKey(x.date)
  return (
    <li className="panel flex gap-4 p-5">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-bar/10 py-2 text-bar">
        <span className="text-[11px] font-medium uppercase">{fmt(x.date, { weekday: 'short' })}</span>
        <span className="text-2xl font-semibold leading-tight">{d.getDate()}</span>
        <span className="text-[11px]">{fmt(x.date, { month: 'short' })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 font-semibold">{x.title}</h2>
          {editable && (
            <span className="-mr-2 -mt-1 flex">
              <IconButton label={t('common.edit')} onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton label={t('announce.delete')} onClick={onDelete} className="hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          {fmtLong(x.date)}
          {x.start && (
            <span>
              {'· '}
              {x.start}
              {x.end && `–${x.end}`}
            </span>
          )}
          {!!x.extraStaff && (
            <Badge tone="warn">
              <UserPlus className="h-3 w-3" />
              {x.dept ? t('announce.extraIn', { count: x.extraStaff, dept: deptName(s, x.dept) }) : t('announce.extra', { count: x.extraStaff })}
            </Badge>
          )}
        </div>
        {x.body && <p className="mt-2 whitespace-pre-line text-sm text-ink/85">{x.body}</p>}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Send className="h-3 w-3" /> {t('announce.sentTo', { count: x.sentTo })} · {x.by} · {relTime(x.at)}
        </p>
      </div>
    </li>
  )
}

function AnnouncementForm({ current, onClose }: { current?: Announcement; onClose: () => void }) {
  const { a, toast, depts } = useStore()
  const { t } = useT()
  const [title, setTitle] = useState(current?.title ?? '')
  const [date, setDate] = useState(current?.date ?? addDays(todayKey(), 1))
  const [start, setStart] = useState(current?.start ?? '')
  const [end, setEnd] = useState(current?.end ?? '')
  const [body, setBody] = useState(current?.body ?? '')
  const [extra, setExtra] = useState(String(current?.extraStaff ?? 0))
  const [dept, setDept] = useState<Dept | ''>(current?.dept ?? '')
  const [tried, setTried] = useState(false)
  const errTitle = !title.trim() ? t('announce.errTitle') : undefined
  const errDate = !date ? t('announce.errDate') : date < todayKey() && !current ? t('announce.errPast') : undefined
  const errEnd = end && !start ? t('announce.errEnd') : undefined

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    setTried(true)
    if (errTitle || errDate || errEnd) return
    const n = Math.max(0, Math.round(Number(extra) || 0))
    const count = a.saveAnnouncement({
      id: current?.id,
      title: title.trim(),
      date,
      start: start || undefined,
      end: end || undefined,
      body: body.trim(),
      extraStaff: n || undefined,
      dept: n && dept ? dept : undefined,
    })
    toast(t(current ? 'announce.updated' : 'announce.sent', { count }))
    onClose()
  }

  return (
    <Modal
      title={current ? t('announce.editTitle') : t('announce.new')}
      description={t('announce.formHint')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" type="submit" form="announce-form">
            <Send className="h-4 w-4" /> {current ? t('announce.saveSend') : t('announce.send')}
          </Button>
        </>
      }
    >
      <form id="announce-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('announce.fTitle')} htmlFor="an-title" error={tried ? errTitle : undefined}>
          <input id="an-title" className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('announce.fTitlePh')} autoFocus />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('announce.fDate')} htmlFor="an-date" error={tried ? errDate : undefined}>
            <input id="an-date" type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('announce.fStart')} htmlFor="an-start">
            <input id="an-start" type="time" className="input w-full" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t('announce.fEnd')} htmlFor="an-end" error={tried ? errEnd : undefined}>
            <input id="an-end" type="time" className="input w-full" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label={t('announce.fBody')} htmlFor="an-body">
          <textarea id="an-body" rows={4} className="input h-auto w-full py-2" value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('announce.fBodyPh')} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <Field label={t('announce.fExtra')} htmlFor="an-extra" hint={t('announce.fExtraHint')}>
            <input id="an-extra" type="number" min={0} max={50} className="input w-full" value={extra} onChange={(e) => setExtra(e.target.value)} />
          </Field>
          <Field label={t('announce.fDept')} htmlFor="an-dept">
            <select id="an-dept" className={cx('input w-full', !(Number(extra) > 0) && 'opacity-50')} disabled={!(Number(extra) > 0)} value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">{t('announce.anyDept')}</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </form>
    </Modal>
  )
}

/** Compact pill for the schedule's day header and the dashboard. */
export function AnnouncementPill({ x }: { x: Announcement }) {
  const { t } = useT()
  return (
    <a
      href="#/announcements"
      title={[x.title, x.body].filter(Boolean).join('\n')}
      className="mt-1.5 flex w-full items-start gap-1.5 rounded-md bg-bar/10 px-1.5 py-1 text-left text-xs leading-snug text-[#7A4F12] hover:bg-bar/20"
    >
      <Megaphone className="mt-px h-3 w-3 shrink-0" aria-label={t('announce.one')} />
      <span className="min-w-0">
        <span className="line-clamp-2 font-medium">{x.title}</span>
        {(x.start || x.extraStaff) && (
          <span className="flex items-center gap-1 opacity-80">
            {x.start}
            {x.extraStaff ? (
              <>
                {x.start && ' · '}+{x.extraStaff}
                {x.dept && <DeptDot id={x.dept} className="h-1.5 w-1.5" />}
              </>
            ) : null}
          </span>
        )}
      </span>
    </a>
  )
}
