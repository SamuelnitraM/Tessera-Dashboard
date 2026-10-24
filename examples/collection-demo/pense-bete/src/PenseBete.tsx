import { useState } from 'react'
import {
  Button,
  ConfirmDialog,
  openContextMenu,
  usePluginTranslation,
  type WidgetProps
} from '@tessera/module-sdk'
import styles from './PenseBete.module.css'

interface Task {
  id: string
  text: string
  done: boolean
}

interface PenseBeteConfig {
  /** Réglage du manifeste. */
  hideDone: boolean
  /** Données du bloc, enregistrées avec setConfig (dans la page, comme le reste du tableau). */
  tasks?: Task[]
}

export function PenseBete({ config, setConfig }: WidgetProps<PenseBeteConfig>) {
  const t = usePluginTranslation()
  const [draft, setDraft] = useState('')
  const [confirming, setConfirming] = useState(false)
  const tasks = config.tasks ?? []
  const visible = config.hideDone ? tasks.filter((task) => !task.done) : tasks
  const remaining = tasks.filter((task) => !task.done).length

  const save = (next: Task[]): void => setConfig({ tasks: next })
  const add = (): void => {
    const text = draft.trim()
    if (!text) return
    save([...tasks, { id: crypto.randomUUID(), text, done: false }])
    setDraft('')
  }

  return (
    <div className={styles.list}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <input
          className={styles.input}
          value={draft}
          maxLength={200}
          placeholder={t('placeholder')}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={!draft.trim()}>
          {t('add')}
        </Button>
      </form>

      <ul className={styles.tasks}>
        {visible.map((task) => (
          <li
            key={task.id}
            className={styles.task}
            data-done={task.done}
            onContextMenu={openContextMenu([
              {
                label: t('remove'),
                danger: true,
                onSelect: () => save(tasks.filter((other) => other.id !== task.id))
              }
            ])}
          >
            <label>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() =>
                  save(
                    tasks.map((other) =>
                      other.id === task.id ? { ...other, done: !other.done } : other
                    )
                  )
                }
              />
              <span>{task.text}</span>
            </label>
          </li>
        ))}
      </ul>

      <footer className={styles.footer}>
        <span>{t('remaining', { count: remaining })}</span>
        {tasks.length > 0 && (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            {t('clear')}
          </Button>
        )}
      </footer>

      <ConfirmDialog
        open={confirming}
        title={t('clearTitle')}
        message={t('clearMessage')}
        onClose={() => setConfirming(false)}
        actions={[
          { label: t('cancel'), onClick: () => setConfirming(false) },
          {
            label: t('clear'),
            variant: 'danger',
            onClick: () => {
              save([])
              setConfirming(false)
            }
          }
        ]}
      />
    </div>
  )
}
