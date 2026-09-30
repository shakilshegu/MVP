import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Assignment } from '../lib/types'
import { useT } from '../i18n'
import { cx } from './ui'


export function TaskList({ x, editable }: { x: Assignment; editable: boolean }) {
  const { a } = useStore()
  const { t } = useT()
  const [text, setText] = useState('')
  const tasks = x.tasks ?? []
  const suggestions = t(`tasks.suggest.${x.dept}`).split('|').filter((s) => !tasks.some((x) => x.text.toLowerCase() === s.toLowerCase())).slice(0, 4)
  const add = (t: string) => {
    a.addTask(x.id, t)
    setText('')
  }

  if (!editable && tasks.length === 0) return null

  return (
    <div className="border-t border-line px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{t('tasks.title')}</span>
        {tasks.length > 0 && (
          <span className="text-xs text-muted">
            {t('tasks.done', { done: tasks.filter((x) => x.done).length, total: tasks.length })}
          </span>
        )}
      </div>

      {tasks.length > 0 && (
        <ul className="mb-2 space-y-0.5">
          {tasks.map((task) => (
            <li key={task.id} className="group flex items-center gap-2 rounded-md py-1 pr-1">
              <button
                role="checkbox"
                aria-checked={task.done}
                aria-label={task.text}
                disabled={!editable}
                onClick={() => a.toggleTask(x.id, task.id)}
                className={cx(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                  task.done ? 'border-forest bg-forest text-white' : 'border-sage-dark bg-white hover:border-forest',
                )}
              >
                {task.done && <Check className="h-3 w-3" />}
              </button>
              <span className={cx('flex-1 text-sm', task.done && 'text-muted line-through')}>{task.text}</span>
              {x.state === 'published' && !x.publishedTasks?.some((p) => p.id === task.id) && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bark" title={t('tasks.notPublished')} aria-label={t('tasks.notPublished')} />
              )}
              {editable && (
                <button
                  aria-label={t('tasks.removeTask', { text: task.text })}
                  onClick={() => a.removeTask(x.id, task.id)}
                  className="rounded p-0.5 text-muted opacity-0 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              add(text)
            }}
            className="relative"
          >
            <label htmlFor={`task-${x.id}`} className="sr-only">
              {t('tasks.addLabel')}
            </label>
            <input
              id={`task-${x.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('tasks.placeholder')}
              className="input h-9 pr-9"
            />
            <button type="submit" disabled={!text.trim()} aria-label={t('tasks.add')} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md text-forest hover:bg-forest-50 disabled:text-muted/50 disabled:hover:bg-transparent">
              <Plus className="h-4 w-4" />
            </button>
          </form>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} onClick={() => add(s)} className="rounded-full bg-paper px-2.5 py-1 text-xs text-ink/80 ring-1 ring-line hover:bg-forest-50 hover:text-forest hover:ring-forest/30">
                  + {s}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
