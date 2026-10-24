import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Copy, Eraser, FolderSearch, Play, Square, Target } from 'lucide-react'
import {
  Button,
  getIntegrationErrorCode,
  getProcessErrorCode,
  PROSPECT_API_VERSIONS,
  SegmentedControl,
  useLatest,
  useNotifications,
  usePluginTranslation,
  useProcesses,
  useProspect,
  WebView,
  type PickedTarget,
  type ProcessRun,
  type ProspectFollowUp,
  type ProspectHealth,
  type ProspectJob,
  type ProspectStatistics,
  type WidgetProps
} from '@tessera/plugin-sdk'
import { Dashboard } from './Dashboard'
import { IconButton } from './IconButton'
import styles from './ProspectWidget.module.css'

type View = 'dashboard' | 'interface' | 'logs'

/** Réglages du manifeste + données du bloc. */
interface ProspectConfig {
  port: number
  notifyJobs: boolean
  notifyFollowUps: boolean
  /** `start.bat` choisi par l'utilisateur (fenêtre de Windows). */
  target?: PickedTarget
  view?: View
  /** Dernier rappel des relances (AAAA-MM-JJ) : une notification par jour au plus. */
  followUpNotice?: string
}

/** Sonde du serveur : rapide pendant le démarrage, plus espacée ensuite. */
const HEALTH_FAST_MS = 2000
const HEALTH_SLOW_MS = 10_000
const DATA_POLL_MS = 30_000
/** Tâches : suivies de près tant que l'une d'elles tourne. */
const JOBS_FAST_MS = 2000
const JOBS_SLOW_MS = 10_000
const MAX_OUTPUT = 100_000

const today = (): string => new Date().toLocaleDateString('sv')

export function ProspectWidget({
  instanceId,
  config,
  setConfig,
  editing
}: WidgetProps<ProspectConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const prospect = useProspect()
  const processes = useProcesses()
  const { notify } = useNotifications()
  const port = config.port
  const view = config.view ?? 'dashboard'

  const [health, setHealth] = useState<ProspectHealth | null>(null)
  const [statistics, setStatistics] = useState<ProspectStatistics | null>(null)
  const [followUps, setFollowUps] = useState<ProspectFollowUp[]>([])
  const [jobs, setJobs] = useState<ProspectJob[]>([])
  const [run, setRun] = useState<ProcessRun | null>(null)
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ownRuns = useRef(new Set<string>())
  const ready = health?.status === 'ready'
  const ownRunning = run?.status === 'running'

  // ---------------------------------------------------------------------------
  // Serveur lancé par ce bloc (permission `processes`)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Sonde et données (connecteur, 127.0.0.1 uniquement)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let active = true
    const probe = (): void => {
      prospect
        .health(port)
        .then((next) => active && setHealth(next))
        .catch(() => active && setHealth({ status: 'offline', apiVersion: null }))
    }
    probe()
    const timer = window.setInterval(probe, ownRunning && !ready ? HEALTH_FAST_MS : HEALTH_SLOW_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [prospect, port, ownRunning, ready])

  const loadData = useCallback(async (): Promise<void> => {
    const [nextStatistics, nextFollowUps] = await Promise.all([
      prospect.statistics(port),
      prospect.followUps(port)
    ])
    setStatistics(nextStatistics)
    setFollowUps(nextFollowUps)
  }, [prospect, port])

  useEffect(() => {
    if (!ready) return
    let active = true
    const load = (): void => {
      loadData().catch(() => active && setHealth({ status: 'offline', apiVersion: null }))
    }
    load()
    const timer = window.setInterval(load, DATA_POLL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [ready, loadData])

  // Tâches en cours, et notification à la fin de chacune
  const previousJobs = useRef<Map<number, string> | null>(null)
  const onJobs = (list: ProspectJob[]): void => {
    const previous = previousJobs.current
    previousJobs.current = new Map(list.map((job) => [job.id, job.status]))
    setJobs(list)
    if (!previous || !config.notifyJobs) return
    for (const job of list) {
      if (previous.get(job.id) !== 'running' || job.status === 'running') continue
      if (job.status === 'completed') {
        void notify({ title: t('notify.jobDone'), body: job.label, tag: `job-${job.id}` })
      } else if (job.status === 'failed') {
        void notify({
          title: t('notify.jobFailed'),
          body: [job.label, job.error].filter(Boolean).join(' : '),
          tag: `job-${job.id}`
        })
      }
    }
  }
  const onJobsRef = useLatest(onJobs)
  const anyRunning = jobs.some((job) => job.status === 'running')

  useEffect(() => {
    if (!ready) {
      previousJobs.current = null
      return
    }
    let active = true
    const load = (): void => {
      prospect
        .jobs(port)
        .then((list) => active && onJobsRef.current(list))
        .catch(() => {})
    }
    load()
    const timer = window.setInterval(load, anyRunning ? JOBS_FAST_MS : JOBS_SLOW_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [prospect, port, ready, anyRunning, onJobsRef])

  // Rappel des relances du jour, une fois par jour
  const followUpsDue = statistics?.followUpsDue ?? 0
  useEffect(() => {
    if (!ready || !config.notifyFollowUps || followUpsDue === 0) return
    if (config.followUpNotice === today()) return
    setConfig({ followUpNotice: today() })
    void notify({
      title: t('notify.followUpsTitle', { count: followUpsDue }),
      body: t('notify.followUpsBody'),
      tag: 'follow-ups'
    })
  }, [ready, followUpsDue, config.notifyFollowUps, config.followUpNotice, setConfig, notify, t])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const fail = (cause: unknown): void => setError(t(`errors.${getProcessErrorCode(cause)}`))

  const pick = async (): Promise<void> => {
    try {
      const picked = await processes.pick()
      if (!picked) return
      setError(null)
      setConfig({ target: picked })
    } catch (cause) {
      fail(cause)
    }
  }

  const start = async (): Promise<void> => {
    if (!config.target) return
    setError(null)
    // Rien ne doit déjà écouter sur le port (serveur lancé ailleurs, autre programme)
    const current = await prospect.health(port).catch(() => null)
    if (current && current.status !== 'offline') {
      setHealth(current)
      setError(
        current.status === 'ready' ? t('errors.alreadyRunning') : t('errors.portBusy', { port })
      )
      return
    }
    try {
      const started = await processes.start(instanceId, {
        path: config.target.path,
        // Le navigateur ne s'ouvre pas : l'interface est dans le bloc (start.bat transmet %*)
        args: '--no-browser',
        cwd: '',
        mode: 'captured'
      })
      ownRuns.current.add(started.id)
      setRun(started)
    } catch (cause) {
      fail(cause)
    }
  }

  /** N'arrête que le serveur lancé par ce bloc (et les programmes qu'il a lancés lui-même). */
  const stop = (): void => {
    if (run && ownRunning) void processes.stop(run.id).catch(fail)
  }

  const cancelJob = (jobId: number): void => {
    prospect
      .cancelJob(port, jobId)
      .then(() => prospect.jobs(port))
      .then((list) => onJobsRef.current(list))
      .catch((cause) => setError(t(`errors.${getIntegrationErrorCode(cause)}`)))
  }

  const call = (phone: string): void => {
    prospect.call(phone).catch(() => void navigator.clipboard.writeText(phone))
  }

  // ---------------------------------------------------------------------------
  // Affichage
  // ---------------------------------------------------------------------------

  const status = describeStatus(health, run, port, t)

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.icon}>
          <Target size={20} aria-hidden />
        </span>
        <div className={styles.identity}>
          <span className={styles.name}>Prospect Solution</span>
          <span className={styles.status} data-state={status.state}>
            <span className={styles.dot} aria-hidden />
            <span className={styles.statusText} title={error ?? status.text}>
              {error ?? status.text}
            </span>
          </span>
        </div>
        <div className={`${styles.actions} no-drag`}>
          {(editing || !config.target) && (
            <IconButton icon={FolderSearch} label={t('pick')} onClick={() => void pick()} />
          )}
          {ownRunning ? (
            <Button icon={Square} onClick={stop}>
              <span className={styles.buttonLabel}>{t('stop')}</span>
            </Button>
          ) : (
            config.target &&
            health?.status === 'offline' && (
              <Button variant="primary" icon={Play} onClick={() => void start()}>
                <span className={styles.buttonLabel}>{t('start')}</span>
              </Button>
            )
          )}
        </div>
      </div>

      <div className={`${styles.tabs} no-drag`}>
        <SegmentedControl
          value={view}
          onChange={(next) => setConfig({ view: next })}
          aria-label={t('view')}
          options={[
            { value: 'dashboard', label: t('views.dashboard') },
            { value: 'interface', label: t('views.interface') },
            { value: 'logs', label: t('views.logs') }
          ]}
        />
      </div>

      <div className={styles.body}>
        {!config.target && !ready && (
          <div className={styles.empty}>
            <p>{t('intro')}</p>
            <Button
              variant="primary"
              icon={FolderSearch}
              className="no-drag"
              onClick={() => void pick()}
            >
              {t('pick')}
            </Button>
          </div>
        )}

        {view === 'dashboard' &&
          (ready && statistics ? (
            <Dashboard
              statistics={statistics}
              followUps={followUps}
              jobs={jobs}
              onCancelJob={cancelJob}
              onCall={call}
            />
          ) : (
            config.target && <p className={styles.placeholder}>{t('serverOff')}</p>
          ))}

        {view === 'interface' &&
          (ready ? (
            <div className={styles.frame}>
              <WebView src={`http://127.0.0.1:${port}/`} inert={editing} />
            </div>
          ) : (
            <p className={styles.placeholder}>{t('serverOff')}</p>
          ))}

        {view === 'logs' &&
          (run ? (
            <Logs
              output={output}
              onClear={() => {
                void processes.clearOutput(run.id)
                setOutput('')
              }}
            />
          ) : (
            <p className={styles.placeholder}>{t('noOwnRun')}</p>
          ))}
      </div>
    </div>
  )
}

function Logs({ output, onClear }: { output: string; onClear: () => void }): React.JSX.Element {
  const t = usePluginTranslation()
  const preRef = useRef<HTMLPreElement>(null)
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
        {output || <span className={styles.muted}>{t('noLogs')}</span>}
      </pre>
      <div className={`${styles.logActions} no-drag`}>
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

type StatusState = 'idle' | 'running' | 'warning' | 'error'

function describeStatus(
  health: ProspectHealth | null,
  run: ProcessRun | null,
  port: number,
  t: (key: string, values?: Record<string, unknown>) => string
): { state: StatusState; text: string } {
  const own = run?.status === 'running'
  if (!health) return { state: 'idle', text: t('status.loading') }
  if (health.status === 'other-service') {
    return { state: 'error', text: t('status.otherService', { port }) }
  }
  if (health.status === 'ready') {
    if (health.apiVersion !== null && !PROSPECT_API_VERSIONS.includes(health.apiVersion)) {
      return { state: 'warning', text: t('status.version', { version: health.apiVersion }) }
    }
    return { state: 'running', text: t(own ? 'status.ready' : 'status.external', { port }) }
  }
  if (own) return { state: 'warning', text: t('status.starting') }
  if (run?.status === 'failed') return { state: 'error', text: t('status.failed') }
  if (run?.status === 'exited' && !run.stoppedByUser && run.exitCode) {
    return { state: 'error', text: t('status.exitCode', { code: run.exitCode }) }
  }
  return { state: 'idle', text: t('status.stopped') }
}
