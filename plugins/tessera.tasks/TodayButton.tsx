import { useEffect, useState } from 'react'
import { ListChecks } from 'lucide-react'
import {
  HeaderButtonText,
  HeaderPanelTitle,
  HeaderWidgetButton,
  mailErrorMessage,
  usePluginTranslation
} from '@tessera/plugin-sdk'
import type { Task, TasksState } from '@shared/tasks'
import styles from './TodayButton.module.css'

const REFRESH_MS = 5 * 60_000

const pad = (value: number): string => String(value).padStart(2, '0')
/** Aujourd'hui (`AAAA-MM-JJ`, heure locale). */
function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Tâches du jour : à faire aujourd'hui ou en retard, les plus anciennes d'abord. */
const dueTasks = (state: TasksState | null, day: string): Task[] =>
  (state?.tasks ?? [])
    .filter((task) => !task.done && task.due !== null && task.due <= day)
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? '') || a.title.localeCompare(b.title))

/** Tâches de toutes les listes, rechargées toutes les 5 minutes et à chaque changement. */
function useTasks(): { state: TasksState | null; setState: (state: TasksState) => void } {
  const [state, setState] = useState<TasksState | null>(null)
  useEffect(() => {
    const api = window.tessera.tasks
    const load = (): void =>
      void api
        .state()
        .then(setState)
        .catch(() => undefined)
    load()
    const timer = window.setInterval(() => !document.hidden && load(), REFRESH_MS)
    const off = api.onChange(setState)
    return () => {
      window.clearInterval(timer)
      off()
    }
  }, [])
  return { state, setState }
}

/** Barre des pages : nombre de tâches du jour ; le panneau les liste, à cocher sur place. */
export function TodayButton(): React.JSX.Element {
  const t = usePluginTranslation()
  const { state, setState } = useTasks()
  const tasks = dueTasks(state, today())
  return (
    <HeaderWidgetButton
      label={tasks.length > 0 ? t('header.label', { count: tasks.length }) : t('header.name')}
      button={
        <>
          <ListChecks size={16} aria-hidden />
          {tasks.length > 0 && <HeaderButtonText>{tasks.length}</HeaderButtonText>}
        </>
      }
    >
      {() => <TodayPanel tasks={tasks} state={state} onState={setState} />}
    </HeaderWidgetButton>
  )
}

function TodayPanel({
  tasks,
  state,
  onState
}: {
  tasks: Task[]
  state: TasksState | null
  onState: (state: TasksState) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const [error, setError] = useState<string | null>(null)
  /** Tâches cochées à l'instant (gardées, barrées, jusqu'à la fermeture du panneau). */
  const [checked, setChecked] = useState<Task[]>([])
  const day = today()
  const listName = (task: Task): string =>
    state?.lists.find((list) => list.id === task.listId)?.name ?? ''

  const complete = (task: Task): void => {
    setChecked((current) => [...current, task])
    setError(null)
    window.tessera.tasks
      .save({ ...task, done: true })
      .then(onState)
      .catch((failure: unknown) => {
        setChecked((current) => current.filter((item) => item.id !== task.id))
        setError(mailErrorMessage(failure))
      })
  }

  const shown = [...tasks, ...checked.filter((task) => !tasks.some((item) => item.id === task.id))]
  return (
    <div className={styles.panel}>
      <HeaderPanelTitle title={t('header.name')} />
      {!state ? (
        <p className={styles.muted}>{t('header.loading')}</p>
      ) : shown.length === 0 ? (
        <p className={styles.muted}>{t('header.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((task) => {
            const done = checked.some((item) => item.id === task.id)
            return (
              <li key={task.id} className={styles.task} data-done={done}>
                <input
                  type="checkbox"
                  checked={done}
                  disabled={done}
                  aria-label={t('header.complete', { title: task.title })}
                  onChange={() => complete(task)}
                />
                <span className={styles.text}>
                  <span className={styles.title}>{task.title || t('header.untitled')}</span>
                  <span className={styles.muted}>
                    {task.due && task.due < day ? `${t('header.late')} · ` : ''}
                    {listName(task)}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
