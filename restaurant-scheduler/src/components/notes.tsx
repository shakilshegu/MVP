import { useState } from 'react'
import { StickyNote } from 'lucide-react'
import { useStore } from '../lib/store'
import { fmtLong } from '../lib/date'
import { useT } from '../i18n'
import { Button, cx, Popover } from './ui'

/** A day's note under the schedule header, or a quiet "+ Note" on hover. */
export function DayNote({ note, editable, onEdit }: { note?: string; editable: boolean; onEdit: (el: HTMLElement) => void }) {
  const { t } = useT()
  if (note) {
    return (
      <button
        disabled={!editable}
        onClick={(e) => onEdit(e.currentTarget)}
        title={note}
        className="mt-1.5 flex w-full items-start gap-1.5 rounded-md bg-morning/50 px-1.5 py-1 text-left text-xs leading-snug text-morning-ink hover:bg-morning disabled:cursor-default disabled:hover:bg-morning/50"
      >
        <StickyNote className="mt-px h-3 w-3 shrink-0" aria-hidden />
        <span className="line-clamp-2">{note}</span>
      </button>
    )
  }
  if (!editable) return null
  return (
    <button
      onClick={(e) => onEdit(e.currentTarget)}
      className="mt-1.5 flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-muted opacity-0 transition-opacity hover:bg-paper hover:text-ink focus-visible:opacity-100 group-hover/day:opacity-100"
    >
      <StickyNote className="h-3 w-3" aria-hidden /> {t('notes.add')}
    </button>
  )
}

export function NoteEditor({ date, rect, onClose }: { date: string; rect: DOMRect; onClose: () => void }) {
  const { s, a, branch, toast } = useStore()
  const { t } = useT()
  const current = s.dayNotes[`${branch!.id}|${date}`] ?? ''
  const [text, setText] = useState(current)
  const save = (value: string) => {
    a.setDayNote(date, value)
    toast(t(value.trim() ? 'notes.saved' : 'notes.removed'))
    onClose()
  }
  return (
    <Popover anchor={rect} onClose={onClose} width={300}>
      <form
        className="p-4"
        onSubmit={(e) => {
          e.preventDefault()
          save(text)
        }}
      >
        <label htmlFor="day-note" className="text-sm font-semibold">
          {t('notes.title', { date: fmtLong(date) })}
        </label>
        <p className="mt-0.5 text-xs text-muted">{t('notes.hint')}</p>
        <textarea
          id="day-note"
          autoFocus
          rows={3}
          maxLength={120}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              save(text)
            }
          }}
          placeholder={t('notes.placeholder')}
          className="input mt-3 h-auto resize-none py-2"
        />
        <div className={cx('mt-3 flex items-center gap-2', current ? 'justify-between' : 'justify-end')}>
          {current && (
            <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-50 hover:text-danger" onClick={() => save('')}>
              {t('common.remove')}
            </Button>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" variant="primary" type="submit">
              {t('notes.save')}
            </Button>
          </div>
        </div>
      </form>
    </Popover>
  )
}
