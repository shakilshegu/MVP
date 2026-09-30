import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Assignment, Dept } from '../lib/types'
import { cx } from './ui'

const SUGGESTIONS: Record<Dept, string[]> = {
  Bar: ['Clean tables', 'Restock bar', 'Polish glasses', 'Cut garnishes', 'Change kegs'],
  Service: ['Set tables', 'Fold napkins', 'Clean tables', 'Refill condiments', 'Check reservations'],
  Kitchen: ['Prep vegetables', 'Clean fryer', 'Label and date stock', 'Deep clean grill', 'Check fridge temps'],
}

export function TaskList({ x, editable }: { x: Assignment; editable: boolean }) {
  const { a } = useStore()
  const [text, setText] = useState('')
  const tasks = x.tasks ?? []
  const suggestions = SUGGESTIONS[x.dept].filter((s) => !tasks.some((t) => t.text.toLowerCase() === s.toLowerCase())).slice(0, 4)
  const add = (t: string) => {
    a.addTask(x.id, t)
    setText('')
  }

  if (!editable && tasks.length === 0) return null

  return (
    <div className="border-t border-line px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">Tasks</span>
        {tasks.length > 0 && (
          <span className="text-xs text-muted">
            {tasks.filter((t) => t.done).length}/{tasks.length} done
          </span>
        )}
      </div>

      {tasks.length > 0 && (
        <ul className="mb-2 space-y-0.5">
          {tasks.map((t) => (
            <li key={t.id} className="group flex items-center gap-2 rounded-md py-1 pr-1">
              <button
                role="checkbox"
                aria-checked={t.done}
                aria-label={t.text}
                disabled={!editable}
                onClick={() => a.toggleTask(x.id, t.id)}
                className={cx(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                  t.done ? 'border-forest bg-forest text-white' : 'border-sage-dark bg-white hover:border-forest',
                )}
              >
                {t.done && <Check className="h-3 w-3" />}
              </button>
              <span className={cx('flex-1 text-sm', t.done && 'text-muted line-through')}>{t.text}</span>
              {x.state === 'published' && !x.publishedTasks?.some((p) => p.id === t.id) && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bark" title="Not published yet" aria-label="Not published yet" />
              )}
              {editable && (
                <button
                  aria-label={`Remove task ${t.text}`}
                  onClick={() => a.removeTask(x.id, t.id)}
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
              Add a task
            </label>
            <input
              id={`task-${x.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a task, e.g. Clean tables"
              className="input h-9 pr-9"
            />
            <button type="submit" disabled={!text.trim()} aria-label="Add task" className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md text-forest hover:bg-forest-50 disabled:text-muted/50 disabled:hover:bg-transparent">
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
