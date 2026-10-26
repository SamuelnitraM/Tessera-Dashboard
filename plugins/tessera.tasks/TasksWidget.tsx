import { useCallback, useEffect, useState } from 'react'
import {
  CalendarDays,
  Columns3,
  Eye,
  EyeOff,
  List,
  ListPlus,
  LoaderCircle,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react'
import {
  Button,
  mailErrorMessage,
  openContextMenu,
  openMenuBelow,
  useLanguage,
  usePluginTranslation,
  type WidgetProps
} from '@tessera/plugin-sdk'
import type { Task, TaskList, TasksState } from '@shared/tasks'
import styles from './TasksWidget.module.css'

interface TasksConfig {
  view?: 'list' | 'kanban'
  listId?: string
  showDone?: boolean
}

const REFRESH_MS = 5 * 60_000

/** Tâches : listes locales et Google Tasks, en liste ou en kanban (une colonne par liste). */
export function TasksWidget({ config, setConfig }: WidgetProps<TasksConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.tasks
  const [state, setState] = useState<TasksState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const view = config.view ?? 'list'
  const showDone = config.showDone ?? false

  const apply = useCallback((promise: Promise<TasksState>) => {
    setBusy(true)
    promise
      .then((next) => {
        setState(next)
        setError(null)
      })
      .catch((failure: unknown) => setError(mailErrorMessage(failure)))
      .finally(() => setBusy(false))
  }, [])

  // Chargement, puis toutes les 5 minutes (sans indicateur d'activité)
  useEffect(() => {
    const load = (): void =>
      void api
        .state()
        .then(setState)
        .catch((failure: unknown) => setError(mailErrorMessage(failure)))
    load()
    const timer = window.setInterval(() => !document.hidden && load(), REFRESH_MS)
    // Changement fait dans un autre bloc
    const off = api.onChange(setState)
    return () => {
      window.clearInterval(timer)
      off()
    }
  }, [api])

  const lists = state?.lists ?? []
  const current = lists.find((list) => list.id === config.listId) ?? lists[0]

  const save = (
    task: Task | null,
    patch: Partial<Task> & { listId: string },
    previousListId?: string
  ): void =>
    apply(
      api.save(
        {
          id: task?.id,
          title: task?.title ?? '',
          notes: task?.notes ?? '',
          due: task?.due ?? null,
          done: task?.done ?? false,
          ...patch
        },
        previousListId
      )
    )

  const connect = (): void => {
    setConnecting(true)
    window.tessera.accounts
      .connectGoogle(['tasks'])
      .then(() => apply(api.state()))
      .catch((failure: unknown) => setError(mailErrorMessage(failure)))
      .finally(() => setConnecting(false))
  }

  /** Nouvelle liste en cours de saisie : locale (`null`) ou dans un compte Google. */
  const [newListFor, setNewListFor] = useState<string | null | undefined>(undefined)
  const [listName, setListName] = useState('')
  const newList = (account: string | null): void => {
    setListName('')
    setNewListFor(account)
  }

  return (
    <div className={styles.tasks}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.iconButton}
          data-active={view === 'list'}
          title={t('listView')}
          aria-label={t('listView')}
          onClick={() => setConfig({ view: 'list' })}
        >
          <List size={15} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          data-active={view === 'kanban'}
          title={t('kanbanView')}
          aria-label={t('kanbanView')}
          onClick={() => setConfig({ view: 'kanban' })}
        >
          <Columns3 size={15} aria-hidden />
        </button>
        {view === 'list' && lists.length > 0 && (
          <select
            className={styles.select}
            value={current?.id}
            aria-label={t('list')}
            onChange={(event) => setConfig({ listId: event.target.value })}
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
                {list.account ? ` · ${list.account}` : ` · ${t('local')}`}
              </option>
            ))}
          </select>
        )}
        <span className={styles.spacer} />
        {busy && <LoaderCircle size={14} className={styles.spin} aria-hidden />}
        <button
          type="button"
          className={styles.iconButton}
          title={showDone ? t('hideDone') : t('showDone')}
          aria-label={showDone ? t('hideDone') : t('showDone')}
          onClick={() => setConfig({ showDone: !showDone })}
        >
          {showDone ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('newList')}
          aria-label={t('newList')}
          onClick={openMenuBelow(() => [
            { label: t('newLocalList'), icon: ListPlus, onSelect: () => newList(null) },
            ...(state?.accounts ?? []).map((account) => ({
              label: t('newGoogleList', { email: account.email }),
              icon: ListPlus,
              onSelect: () => newList(account.id)
            }))
          ])}
        >
          <ListPlus size={15} aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          title={t('refresh')}
          aria-label={t('refresh')}
          onClick={() => apply(api.state())}
        >
          <RefreshCw size={14} aria-hidden />
        </button>
      </div>

      {newListFor !== undefined && (
        <form
          className={styles.add}
          onSubmit={(event) => {
            event.preventDefault()
            if (listName.trim()) apply(api.createList(listName.trim(), newListFor))
            setNewListFor(undefined)
          }}
        >
          <input
            autoFocus
            value={listName}
            placeholder={t('listName')}
            aria-label={t('listName')}
            onChange={(event) => setListName(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setNewListFor(undefined)}
            onBlur={() => !listName.trim() && setNewListFor(undefined)}
          />
        </form>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {state?.accounts
        .filter((account) => account.error)
        .map((account) => (
          <p key={account.id} className={styles.error}>
            {account.email} : {mailErrorMessage(new Error(`mail-error:${account.error}`))}
          </p>
        ))}

      {state === null ? (
        <p className={styles.empty}>{t('loading')}</p>
      ) : view === 'list' && current ? (
        <ListView
          list={current}
          tasks={state.tasks.filter(
            (task) => task.listId === current.id && (showDone || !task.done)
          )}
          lists={lists}
          onSave={save}
          onDelete={(task) => apply(api.remove(task.id, task.listId))}
          onDeleteList={() => {
            if (window.confirm?.(t('deleteListConfirm', { name: current.name }))) {
              apply(api.deleteList(current.id))
              setConfig({ listId: undefined })
            }
          }}
        />
      ) : (
        <div className={styles.kanban}>
          {lists.map((list) => (
            <Column
              key={list.id}
              list={list}
              tasks={state.tasks.filter(
                (task) => task.listId === list.id && (showDone || !task.done)
              )}
              allTasks={state.tasks}
              onSave={save}
              onDelete={(task) => apply(api.remove(task.id, task.listId))}
            />
          ))}
        </div>
      )}

      {state && state.accounts.length === 0 && (
        <div className={styles.connect}>
          <span>{t('googleHint')}</span>
          <Button disabled={connecting} onClick={connect}>
            {connecting ? t('waiting') : t('connectGoogle')}
          </Button>
        </div>
      )}
    </div>
  )
}

type Save = (
  task: Task | null,
  patch: Partial<Task> & { listId: string },
  previousListId?: string
) => void

function AddTask({ listId, onSave }: { listId: string; onSave: Save }): React.JSX.Element {
  const t = usePluginTranslation()
  const [title, setTitle] = useState('')
  return (
    <form
      className={styles.add}
      onSubmit={(event) => {
        event.preventDefault()
        if (!title.trim()) return
        onSave(null, { listId, title: title.trim() })
        setTitle('')
      }}
    >
      <input
        value={title}
        placeholder={t('addTask')}
        aria-label={t('addTask')}
        onChange={(event) => setTitle(event.target.value)}
      />
    </form>
  )
}

function ListView({
  list,
  tasks,
  lists,
  onSave,
  onDelete,
  onDeleteList
}: {
  list: TaskList
  tasks: Task[]
  lists: TaskList[]
  onSave: Save
  onDelete: (task: Task) => void
  onDeleteList: () => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const sorted = [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done) || (a.due ?? '9999').localeCompare(b.due ?? '9999')
  )
  return (
    <div className={styles.listView}>
      <AddTask listId={list.id} onSave={onSave} />
      {sorted.length === 0 ? (
        <p className={styles.empty}>{t('noTasks')}</p>
      ) : (
        <ul className={styles.taskList}>
          {sorted.map((task) => (
            <TaskRow key={task.id} task={task} lists={lists} onSave={onSave} onDelete={onDelete} />
          ))}
        </ul>
      )}
      <button type="button" className={styles.linkButton} onClick={onDeleteList}>
        <Trash2 size={12} aria-hidden /> {t('deleteList')}
      </button>
    </div>
  )
}

function TaskRow({
  task,
  lists,
  onSave,
  onDelete,
  compact = false
}: {
  task: Task
  lists: TaskList[]
  onSave: Save
  onDelete: (task: Task) => void
  compact?: boolean
}): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes)
  const [open, setOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const overdue = !task.done && task.due !== null && task.due < today

  const finish = (): void => {
    setEditing(false)
    if (title.trim() && title.trim() !== task.title)
      onSave(task, { listId: task.listId, title: title.trim() })
    else setTitle(task.title)
  }

  return (
    <li
      className={styles.task}
      data-done={task.done}
      draggable={compact}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          'application/x-tessera-task',
          JSON.stringify({ id: task.id, listId: task.listId })
        )
        event.dataTransfer.effectAllowed = 'move'
      }}
      onContextMenu={openContextMenu([
        ...lists
          .filter((list) => list.id !== task.listId)
          .map((list) => ({
            label: t('moveTo', { name: list.name }),
            onSelect: () => onSave(task, { listId: list.id }, task.listId)
          })),
        'separator' as const,
        { label: t('delete'), icon: Trash2, danger: true, onSelect: () => onDelete(task) }
      ])}
    >
      <input
        type="checkbox"
        checked={task.done}
        aria-label={task.done ? t('markUndone') : t('markDone')}
        onChange={(event) => onSave(task, { listId: task.listId, done: event.target.checked })}
      />
      <div className={styles.taskBody}>
        {editing ? (
          <input
            className={styles.titleInput}
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={finish}
            onKeyDown={(event) => {
              if (event.key === 'Enter') finish()
              if (event.key === 'Escape') {
                setTitle(task.title)
                setEditing(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className={styles.title}
            onClick={() => setOpen(!open)}
            onDoubleClick={() => setEditing(true)}
          >
            {task.title}
          </button>
        )}
        <span className={styles.meta}>
          <label className={styles.due} data-overdue={overdue}>
            <CalendarDays size={11} aria-hidden />
            {task.due
              ? new Date(`${task.due}T12:00:00`).toLocaleDateString(language, {
                  day: 'numeric',
                  month: 'short'
                })
              : t('noDue')}
            <input
              type="date"
              value={task.due ?? ''}
              aria-label={t('due')}
              onChange={(event) =>
                onSave(task, { listId: task.listId, due: event.target.value || null })
              }
            />
          </label>
          {task.notes && !open && (
            <span className={styles.notesHint}>{task.notes.split('\n')[0]}</span>
          )}
        </span>
        {open && (
          <textarea
            className={styles.notes}
            value={notes}
            placeholder={t('notes')}
            aria-label={t('notes')}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => notes !== task.notes && onSave(task, { listId: task.listId, notes })}
          />
        )}
      </div>
      <button
        type="button"
        className={styles.remove}
        title={t('delete')}
        aria-label={t('delete')}
        onClick={() => onDelete(task)}
      >
        <X size={13} aria-hidden />
      </button>
    </li>
  )
}

function Column({
  list,
  tasks,
  allTasks,
  onSave,
  onDelete
}: {
  list: TaskList
  tasks: Task[]
  allTasks: Task[]
  onSave: Save
  onDelete: (task: Task) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const [over, setOver] = useState(false)
  return (
    <section
      className={styles.column}
      data-over={over}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('application/x-tessera-task')) return
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false)
        const data = event.dataTransfer.getData('application/x-tessera-task')
        if (!data) return
        const { id, listId } = JSON.parse(data) as { id: string; listId: string }
        if (listId === list.id) return
        const task = allTasks.find((item) => item.id === id && item.listId === listId)
        if (task) onSave(task, { listId: list.id }, listId)
      }}
    >
      <header>
        <strong>{list.name}</strong>
        <span className={styles.muted}>{list.account ?? t('local')}</span>
      </header>
      <ul className={styles.taskList}>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            lists={[]}
            onSave={onSave}
            onDelete={onDelete}
            compact
          />
        ))}
      </ul>
      <AddTask listId={list.id} onSave={onSave} />
    </section>
  )
}
