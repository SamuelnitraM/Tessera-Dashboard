import { useCallback, useEffect, useRef, useState } from 'react'
import { FolderSearch, Rocket, Square, SquareArrowOutUpRight } from 'lucide-react'
import {
  Button,
  getIntegrationErrorCode,
  getIntegrationErrorMessage,
  SegmentedControl,
  useDevLauncher,
  useLatest,
  useNotifications,
  usePluginTranslation,
  type DevLauncherService,
  type DevLauncherState,
  type WidgetProps
} from '@tessera/plugin-sdk'
import { IconButton } from './IconButton'
import { LogPanel } from './LogPanel'
import { ProjectList } from './ProjectList'
import { ServicesPanel } from './ServicesPanel'
import styles from './DevLauncherWidget.module.css'

type View = 'projects' | 'services' | 'logs'

/** Réglages du manifeste + préférences enregistrées par le bloc. */
export interface DevLauncherConfig {
  notify: boolean
  view?: View
  /** Profil choisi pour chaque projet (chemin -> profil). */
  profiles?: Record<string, string>
  /** Journal affiché (nom de service, ou `lancement`). */
  logSource?: string
}

/** Fréquences de rafraîchissement : état général, puis services (serveur MCP). */
const STATE_POLL_MS = 6000
const SERVICES_POLL_MS = 3000
/** Un service arrêté peu après « Tout arrêter » ou « Redémarrer » n'est pas une panne. */
const QUIET_AFTER_ACTION_MS = 15_000

export function DevLauncherWidget({
  config,
  setConfig,
  editing
}: WidgetProps<DevLauncherConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const devlauncher = useDevLauncher()
  const { notify } = useNotifications()

  const [state, setState] = useState<DevLauncherState | null>(null)
  const [services, setServices] = useState<DevLauncherService[]>([])
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [launching, setLaunching] = useState<string | null>(null)
  const view = config.view ?? 'projects'
  const connected = state?.mcp.status === 'connected'

  // Notifications : projet lancé depuis le bloc (en attente de « prêt »), dernière action
  const awaitingReady = useRef<string | null>(null)
  const lastAction = useRef(0)
  const previousServices = useRef<DevLauncherService[] | null>(null)
  const configRef = useLatest(config)

  const fail = useCallback(
    (cause: unknown): void => {
      const code = getIntegrationErrorCode(cause)
      setMessage({
        text: code === 'failed' ? getIntegrationErrorMessage(cause) : t(`errors.${code}`),
        error: true
      })
    },
    [t]
  )

  // État de DevLauncher (fichiers, processus, serveur MCP)
  const refreshState = useCallback(
    (): Promise<void> => devlauncher.state().then(setState, fail),
    [devlauncher, fail]
  )

  useEffect(() => {
    void refreshState()
    const timer = window.setInterval(() => void refreshState(), STATE_POLL_MS)
    return () => window.clearInterval(timer)
  }, [refreshState])

  /** Compare deux relevés : environnement prêt, service arrêté de lui-même. */
  const detectChanges = (list: DevLauncherService[]): void => {
    const previous = previousServices.current
    previousServices.current = list
    if (!configRef.current.notify) return

    const project = awaitingReady.current
    if (project) {
      const own = list.filter((service) => service.project === project)
      if (own.length > 0 && own.every((service) => service.running && service.ready !== false)) {
        awaitingReady.current = null
        void notify({
          title: t('notify.readyTitle'),
          body: t('notify.readyBody', { project }),
          tag: `ready-${project}`
        })
      }
    }

    if (!previous || Date.now() - lastAction.current < QUIET_AFTER_ACTION_MS) return
    for (const service of list) {
      const before = previous.find((candidate) => candidate.name === service.name)
      if (before?.running && !service.running) {
        void notify({
          title: t('notify.stoppedTitle', { name: service.name }),
          body: service.project ? t('notify.stoppedBody', { project: service.project }) : '',
          tag: `stopped-${service.name}`
        })
      }
    }
  }

  const detect = useLatest(detectChanges)

  // Services, quand le serveur MCP répond
  useEffect(() => {
    if (!connected) {
      previousServices.current = null
      return
    }
    let active = true
    const poll = (): void => {
      devlauncher
        .services()
        .then((list) => {
          if (!active) return
          setServices(list)
          detect.current(list)
        })
        .catch(() => {})
    }
    poll()
    const timer = window.setInterval(poll, SERVICES_POLL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [connected, devlauncher, detect])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const launch = async (project: string, profile: string | null): Promise<void> => {
    setLaunching(project)
    setMessage({ text: t('launching', { project }), error: false })
    try {
      const outcome = await devlauncher.launch(project, profile)
      awaitingReady.current = project
      setMessage({ text: outcome || t('launched', { project }), error: false })
    } catch (cause) {
      fail(cause)
    } finally {
      setLaunching(null)
      void refreshState()
    }
  }

  const stopAll = async (): Promise<void> => {
    lastAction.current = Date.now()
    awaitingReady.current = null
    try {
      setMessage({ text: await devlauncher.stopAll(), error: false })
    } catch (cause) {
      fail(cause)
    }
  }

  const restart = async (service: string): Promise<void> => {
    lastAction.current = Date.now()
    try {
      setMessage({ text: await devlauncher.restart(service), error: false })
    } catch (cause) {
      fail(cause)
    }
  }

  const open = (): void => {
    setMessage(null)
    devlauncher.open().catch(fail)
  }

  const pickExecutable = (): void => {
    devlauncher
      .pickExecutable()
      .then((path) => {
        if (path) void refreshState()
      })
      .catch(fail)
  }

  // ---------------------------------------------------------------------------
  // Affichage
  // ---------------------------------------------------------------------------

  const status = describeStatus(state, t)
  const visibleServices = connected ? services : []
  const running = visibleServices.some((service) => service.project && service.running)

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.icon}>
          <Rocket size={20} aria-hidden />
        </span>
        <div className={styles.identity}>
          <span className={styles.name}>DevLauncher</span>
          <span className={styles.status} data-state={status.state}>
            <span className={styles.dot} aria-hidden />
            <span className={styles.statusText} title={status.text}>
              {status.text}
            </span>
          </span>
        </div>
        <div className={styles.actions}>
          {(editing || (state?.installed && !state.running)) && (
            <IconButton icon={FolderSearch} label={t('pickExecutable')} onClick={pickExecutable} />
          )}
          {state && !state.running && state.executable && (
            <Button icon={SquareArrowOutUpRight} className="no-drag" onClick={open}>
              <span className={styles.buttonLabel}>{t('open')}</span>
            </Button>
          )}
          {connected && running && (
            <Button icon={Square} className="no-drag" onClick={() => void stopAll()}>
              <span className={styles.buttonLabel}>{t('stopAll')}</span>
            </Button>
          )}
        </div>
      </div>

      <div className={`${styles.tabs} no-drag`}>
        <SegmentedControl
          value={view}
          onChange={(next) => setConfig({ view: next })}
          aria-label={t('view')}
          options={[
            { value: 'projects', label: t('views.projects') },
            { value: 'services', label: t('views.services') },
            { value: 'logs', label: t('views.logs') }
          ]}
        />
      </div>

      {message && (
        <p className={styles.message} data-error={message.error} title={message.text}>
          {message.text}
        </p>
      )}

      {state && !state.installed ? (
        <p className={styles.notice}>{t('notInstalled')}</p>
      ) : state && !connected && view !== 'logs' ? (
        <McpHelp state={state} />
      ) : null}

      <div className={styles.body}>
        {state && view === 'projects' && (
          <ProjectList
            projects={state.projects}
            connected={connected}
            launching={launching}
            chosenProfiles={config.profiles ?? {}}
            onChooseProfile={(path, profile) =>
              setConfig({ profiles: { ...config.profiles, [path]: profile } })
            }
            onLaunch={(project, profile) => void launch(project, profile)}
          />
        )}
        {view === 'services' && connected && (
          <ServicesPanel services={visibleServices} onRestart={(name) => void restart(name)} />
        )}
        {view === 'logs' && state && (
          <LogPanel
            connected={connected}
            services={visibleServices}
            source={config.logSource ?? 'lancement'}
            onSourceChange={(logSource) => setConfig({ logSource })}
          />
        )}
      </div>
    </div>
  )
}

/** Marche à suivre quand Tessera ne peut pas piloter DevLauncher. */
function McpHelp({ state }: { state: DevLauncherState }): React.JSX.Element {
  const t = usePluginTranslation()
  const { status, port } = state.mcp
  return (
    <div className={styles.notice}>
      {status === 'offline' ? (
        <p>{t('help.offline')}</p>
      ) : status === 'other-service' ? (
        <p>{t('help.otherService', { port })}</p>
      ) : status === 'unauthorized' ? (
        <p>{t('help.unauthorized')}</p>
      ) : (
        <>
          <p>{t('help.disabled')}</p>
          <ol>
            <li>{t('help.step1')}</li>
            <li>{t('help.step2')}</li>
            <li>{t('help.step3')}</li>
          </ol>
        </>
      )}
    </div>
  )
}

type StatusState = 'idle' | 'running' | 'warning' | 'error'

function describeStatus(
  state: DevLauncherState | null,
  t: (key: string, values?: Record<string, unknown>) => string
): { state: StatusState; text: string } {
  if (!state) return { state: 'idle', text: t('status.loading') }
  if (!state.installed) return { state: 'error', text: t('status.notInstalled') }
  switch (state.mcp.status) {
    case 'connected':
      return { state: 'running', text: t('status.connected', { port: state.mcp.port }) }
    case 'other-service':
      return { state: 'error', text: t('status.otherService', { port: state.mcp.port }) }
    case 'unauthorized':
      return { state: 'error', text: t('status.unauthorized') }
    default:
      if (!state.running) return { state: 'idle', text: t('status.closed') }
      return {
        state: 'warning',
        text: state.mcp.status === 'disabled' ? t('status.openNoMcp') : t('status.openOffline')
      }
  }
}
