import { useState } from 'react'
import { StickyNote } from 'lucide-react'
import { useStore } from '../lib/store'
import { fmtLong } from '../lib/date'
import { useT } from '../i18n'
import { Button, cx, Popover } from './ui'

/** A day's note under the schedule header: a small badge once set (hover or open it to read), or a quiet "+ Note" button when empty. */
export function DayNote({ note, editable, onEdit }: { note?: string; editable: boolean; onEdit: (el: HTMLElement) => void }) {
  const { t } = useT()
  if (note) {
    return (
      <button
        disabled={!editable}
        onClick={(e) => onEdit(e.currentTarget)}
        title={note}
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-morning/60 px-1.5 py-0.5 text-[10px] font-medium text-morning-ink hover:bg-morning disabled:cursor-default disabled:hover:bg-morning/60"
      >
        <StickyNote className="h-2.5 w-2.5 shrink-0" aria-hidden />
        {t('notes.badge')}
      </button>
    )
  }
  if (!editable) return null
  return (
    <button
      onClick={(e) => onEdit(e.currentTarget)}
      title={t('notes.add')}
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-dashed border-sage-dark px-1.5 py-0.5 text-[10px] font-medium text-muted transition-colors hover:border-forest hover:bg-paper hover:text-ink"
    >
      <StickyNote className="h-2.5 w-2.5 shrink-0" aria-hidden /> {t('notes.add')}
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
