import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Copy,
  Eraser,
  FolderOpen,
  FolderSearch,
  Play,
  RotateCw,
  Rocket,
  Square,
  type LucideIcon
} from 'lucide-react'
import {
  Button,
  defaultConsoleMode,
  getProcessErrorCode,
  useLanguage,
  useLatest,
  usePluginTranslation,
  useProcesses,
  type ConsoleMode,
  type PickedTarget,
  type ProcessRun,
  type WidgetProps
} from '@tessera/plugin-sdk'
import styles from './LauncherWidget.module.css'

/** Réglages du manifeste + programme choisi. */
interface LauncherConfig {
  label: string
  args: string
  cwd: string
  consoleMode: 'auto' | ConsoleMode
  target?: PickedTarget
}

/** Journaux gardés à l'écran (les plus récents). */
const MAX_OUTPUT = 100_000
/** Fréquence de vérification « déjà ouvert hors de Tessera ». */
const EXTERNAL_CHECK_MS = 5000

export function LauncherWidget({
  instanceId,
  config,
  setConfig,
  editing
}: WidgetProps<LauncherConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const processes = useProcesses()
  const target = config.target

  const [run, setRun] = useState<ProcessRun | null>(null)
  const [output, setOutput] = useState('')
  const [icon, setIcon] = useState<string | null>(null)
  const [external, setExternal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Exécutions lancées par ce widget : connues dès l'événement de lancement, avant même
  // la réponse de `start`, pour ne perdre aucune ligne de journal
  const ownRuns = useRef(new Set<string>())
  const restartPending = useRef(false)

  const running = run?.status === 'running'
  const mode: ConsoleMode =
    config.consoleMode === 'auto' && target
      ? defaultConsoleMode(target.kind)
      : config.consoleMode === 'window'
        ? 'window'
        : 'captured'

  // Retrouve l'exécution de ce widget (après un changement de page) et suit les suivantes
  useEffect(() => {
    let active = true
    void processes.list().then((runs) => {
      const mine = runs.find((candidate) => candidate.owner === instanceId)
      if (!active || !mine) return
      ownRuns.current.add(mine.id)
      setRun(mine)
      void processes.getOutput(mine.id).then((text) => active && setOutput(text))
    })

    const offChange = processes.onChange((changed) => {
      if (changed.owner !== instanceId) return
      if (!ownRuns.current.has(changed.id)) {
        ownRuns.current.add(changed.id)
        setOutput('')
      }
      setRun(changed)
    })
    const offOutput = processes.onOutput((runId, text) => {
      if (ownRuns.current.has(runId)) setOutput((previous) => (previous + text).slice(-MAX_OUTPUT))
    })
    return () => {
      active = false
      offChange()
      offOutput()
    }
  }, [processes, instanceId])

  // Icône du programme
  const targetPath = target?.path
  useEffect(() => {
    if (!targetPath) return
    let active = true
    void processes
      .getIcon(targetPath)
      .then((dataUrl) => active && setIcon(dataUrl))
      .catch(() => active && setIcon(null))
    return () => {
      active = false
    }
  }, [processes, targetPath])

  // Programme déjà ouvert en dehors de Tessera ? (vérifié régulièrement quand il n'est pas lancé ici)
  useEffect(() => {
    if (!targetPath || running || target?.kind === 'script') return
    let active = true
    const check = (): void => {
      processes
        .isRunning(targetPath)
        .then((isRunning) => active && setExternal(isRunning))
        .catch(() => active && setExternal(false))
    }
    check()
    const timer = window.setInterval(check, EXTERNAL_CHECK_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [processes, targetPath, running, target?.kind])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const fail = (cause: unknown): void => setError(t(`errors.${getProcessErrorCode(cause)}`))

  const pick = async (): Promise<void> => {
    try {
      const picked = await processes.pick()
      if (!picked) return
      setError(null)
      setIcon(null)
      setConfig({ target: picked })
    } catch (cause) {
      fail(cause)
    }
  }

  const start = async (): Promise<void> => {
    if (!target) return
    setError(null)
    try {
      const started = await processes.start(instanceId, {
        path: target.path,
        args: config.args,
        cwd: config.cwd,
        mode
      })
      ownRuns.current.add(started.id)
      setRun(started)
    } catch (cause) {
      fail(cause)
    }
  }
  const startRef = useLatest(start)

  const stop = (): void => {
    if (run) void processes.stop(run.id).catch(fail)
  }

  // Relancer = arrêter, puis lancer dès que l'arrêt est confirmé
  const restart = (): void => {
    restartPending.current = true
    stop()
  }
  useEffect(() => {
    if (restartPending.current && run && run.status !== 'running') {
      restartPending.current = false
      void startRef.current()
    }
  }, [run, startRef])

  const clearLogs = (): void => {
    if (run) void processes.clearOutput(run.id)
    setOutput('')
  }

  // ---------------------------------------------------------------------------
  // Affichage
  // ---------------------------------------------------------------------------

  if (!target) {
    return (
      <div className={styles.empty}>
        <Rocket size={22} aria-hidden />
        <span>{t('empty')}</span>
        <Button
          variant="primary"
          icon={FolderSearch}
          className="no-drag"
          onClick={() => void pick()}
        >
          {t('pick')}
        </Button>
        {error && <span className={styles.error}>{error}</span>}
      </div>
    )
  }

  const name = config.label.trim() || target.name
  const status = describeStatus(run, external, t, language)
  // Les journaux concernent l'exécution affichée (ou, à défaut, le mode choisi)
  const showLogs = (run?.mode ?? mode) === 'captured'

  return (
    <div className={styles.launcher}>
      <div className={styles.header}>
        <span className={styles.icon}>
          {icon ? (
            <img src={icon} alt="" width={32} height={32} />
          ) : (
            <Rocket size={22} aria-hidden />
          )}
        </span>
        <div className={styles.identity}>
          <span className={styles.name} title={target.path}>
            {name}
          </span>
          <span className={styles.status} data-state={status.state}>
            <span className={styles.dot} aria-hidden />
            <span className={styles.statusText}>{error ?? status.text}</span>
          </span>
        </div>

        <div className={styles.actions}>
          {editing && (
            <IconButton icon={FolderSearch} label={t('change')} onClick={() => void pick()} />
          )}
          <IconButton
            icon={FolderOpen}
            label={t('showInFolder')}
            onClick={() => void processes.showInFolder(target.path).catch(fail)}
          />
          {running && <IconButton icon={RotateCw} label={t('restart')} onClick={restart} />}
          {running ? (
            <Button variant="secondary" icon={Square} className="no-drag" onClick={stop}>
              <span className={styles.buttonLabel}>{t('stop')}</span>
            </Button>
          ) : (
            <Button variant="primary" icon={Play} className="no-drag" onClick={() => void start()}>
              <span className={styles.buttonLabel}>{t('start')}</span>
            </Button>
          )}
        </div>
      </div>

      {showLogs ? (
        <Logs output={output} onClear={clearLogs} />
      ) : (
        <p className={styles.windowMode}>{t('windowMode')}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function Logs({ output, onClear }: { output: string; onClear: () => void }): React.JSX.Element {
  const t = usePluginTranslation()
  const preRef = useRef<HTMLPreElement>(null)
  // Défilement automatique, sauf si l'utilisateur remonte lire les anciennes lignes
  const stickToBottom = useRef(true)

  useLayoutEffect(() => {
    const pre = preRef.current
    if (pre && stickToBottom.current) pre.scrollTop = pre.scrollHeight
  }, [output])

  return (
    <div className={styles.logs}>
      <pre
        ref={preRef}
        className={`${styles.output} no-drag`}
        tabIndex={0}
        onScroll={(event) => {
          const pre = event.currentTarget
          stickToBottom.current = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 24
        }}
      >
        {output || <span className={styles.placeholder}>{t('noLogs')}</span>}
      </pre>
      <div className={styles.logActions}>
        <IconButton
          icon={Copy}
          label={t('copyLogs')}
          disabled={!output}
          onClick={() => void navigator.clipboard.writeText(output)}
        />
        <IconButton icon={Eraser} label={t('clearLogs')} disabled={!output} onClick={onClear} />
      </div>
    </div>
  )
}

interface IconButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
}

function IconButton({ icon: Icon, label, onClick, disabled }: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={`${styles.iconButton} no-drag`}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={16} aria-hidden />
    </button>
  )
}

type StatusState = 'idle' | 'running' | 'external' | 'error'

function describeStatus(
  run: ProcessRun | null,
  external: boolean,
  t: (key: string, values?: Record<string, unknown>) => string,
  language: string
): { state: StatusState; text: string } {
  if (run?.status === 'running') {
    const time = new Date(run.startedAt).toLocaleTimeString(language, {
      hour: '2-digit',
      minute: '2-digit'
    })
    return { state: 'running', text: t('status.running', { time }) }
  }
  if (external) return { state: 'external', text: t('status.external') }
  if (!run) return { state: 'idle', text: t('status.ready') }

  switch (run.status) {
    case 'failed':
      return { state: 'error', text: t('status.failed', { error: run.error ?? '' }) }
    case 'untracked':
      return { state: 'idle', text: t('status.untracked') }
    default:
      // Arrêté par l'utilisateur ; 0 : fin normale ; autre code : fin en erreur
      if (run.stoppedByUser || run.exitCode === null) {
        return { state: 'idle', text: t('status.stopped') }
      }
      if (run.exitCode === 0) return { state: 'idle', text: t('status.finished') }
      return { state: 'error', text: t('status.exitCode', { code: run.exitCode }) }
  }
}
