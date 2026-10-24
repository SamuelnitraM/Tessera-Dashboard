import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppWindow,
  ArrowDown,
  ArrowUp,
  CircleCheck,
  ExternalLink,
  FolderOpen,
  FolderSearch,
  GitBranch,
  Globe,
  Plus,
  RotateCw,
  Search,
  TriangleAlert,
  type LucideIcon
} from 'lucide-react'
import {
  addInstalledApp,
  Button,
  getIntegrationErrorCode,
  InstalledAppView,
  SegmentedControl,
  takeOutInstalledApp,
  useGitSpread,
  useInstalledApps,
  useLanguage,
  usePluginTranslation,
  type GitProjectStatus,
  type GitSpreadProject,
  type GitSpreadState,
  type PanOffset,
  type WidgetProps
} from '@tessera/plugin-sdk'
import styles from './GitSpreadWidget.module.css'

type View = 'projects' | 'app'

/** Réglages du manifeste + préférences du bloc. */
interface GitSpreadConfig {
  pendingOnly: boolean
  view?: View
  /** Application installée « GitSpread » affichée dans le bloc. */
  appId?: string | null
  offset?: PanOffset
}

/** Relecture des projets et de leur état git (lecture seule, sans réseau). */
const REFRESH_MS = 30_000

export function GitSpreadWidget({
  instanceId,
  config,
  setConfig,
  editing
}: WidgetProps<GitSpreadConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const gitspread = useGitSpread()
  const header = useRef<HTMLDivElement>(null)

  const [state, setState] = useState<GitSpreadState | null>(null)
  const [statuses, setStatuses] = useState<Record<string, GitProjectStatus>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const view = config.view ?? 'projects'

  const fail = useCallback(
    (cause: unknown) => setError(t(`errors.${getIntegrationErrorCode(cause)}`)),
    [t]
  )

  /** Projets (paramètres de GitSpread), puis état git de chacun. */
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const next = await gitspread.state()
      setState(next)
      setError(null)
      const paths = next.projects.filter((project) => project.repository).map((p) => p.path)
      const list = paths.length > 0 ? await gitspread.status(paths) : []
      setStatuses(Object.fromEntries(list.map((status) => [status.path, status])))
    } catch (cause) {
      fail(cause)
    } finally {
      setLoading(false)
    }
  }, [gitspread, fail])

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => void refresh(), REFRESH_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [refresh])

  const openApp = (): void => {
    setError(null)
    gitspread.open().catch(fail)
  }

  const pickExecutable = (): void => {
    gitspread
      .pickExecutable()
      .then((path) => {
        if (path) void refresh()
      })
      .catch(fail)
  }

  const statusText = !state
    ? t('status.loading')
    : !state.installed
      ? t('status.notInstalled')
      : t(state.running ? 'status.open' : 'status.closed', { count: state.projects.length })

  return (
    <div className={styles.widget}>
      <div ref={header} className={styles.header}>
        <span className={styles.icon}>
          <GitBranch size={20} aria-hidden />
        </span>
        <div className={styles.identity}>
          <span className={styles.name}>GitSpread</span>
          <span className={styles.status} data-state={state?.running ? 'running' : 'idle'}>
            <span className={styles.dot} aria-hidden />
            <span className={styles.statusText}>{error ?? statusText}</span>
          </span>
        </div>
        <div className={`${styles.actions} no-drag`}>
          {view === 'projects' && (
            <IconButton
              icon={RotateCw}
              label={t('refresh')}
              disabled={loading}
              spin={loading}
              onClick={() => void refresh()}
            />
          )}
          {editing && (
            <IconButton icon={FolderSearch} label={t('pickExecutable')} onClick={pickExecutable} />
          )}
          {view === 'app' && config.appId && (
            <IconButton
              icon={ExternalLink}
              label={t('takeOut')}
              onClick={() => config.appId && void takeOutInstalledApp(config.appId)}
            />
          )}
          {view === 'projects' && state?.executable && (
            <Button icon={AppWindow} onClick={openApp}>
              <span className={styles.buttonLabel}>{t('openApp')}</span>
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
            { value: 'app', label: t('views.app') }
          ]}
        />
      </div>

      {view === 'projects' ? (
        state && (
          <ProjectList
            state={state}
            statuses={statuses}
            pendingOnly={config.pendingOnly}
            onOpenFolder={(path) => void gitspread.openFolder(path).catch(fail)}
            onOpenWeb={(path) => void gitspread.openWeb(path).catch(fail)}
          />
        )
      ) : (
        <AppView instanceId={instanceId} config={config} setConfig={setConfig} panHandle={header} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Projets
// ---------------------------------------------------------------------------

/** Le projet a-t-il quelque chose à faire (modifications, commits à pousser ou à tirer, erreur) ? */
function isPending(status: GitProjectStatus | undefined): boolean {
  if (!status) return false
  return (
    status.error !== null ||
    status.ahead + status.behind + status.staged + status.modified + status.untracked > 0 ||
    status.conflicts > 0
  )
}

function ProjectList({
  state,
  statuses,
  pendingOnly,
  onOpenFolder,
  onOpenWeb
}: {
  state: GitSpreadState
  statuses: Record<string, GitProjectStatus>
  pendingOnly: boolean
  onOpenFolder: (path: string) => void
  onOpenWeb: (path: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const [search, setSearch] = useState('')

  // Comme les onglets de GitSpread : un groupe par propriétaire, puis « Non liés / autres »
  const groups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const visible = state.projects.filter(
      (project) =>
        (!query ||
          project.name.toLowerCase().includes(query) ||
          (project.owner ?? '').toLowerCase().includes(query)) &&
        (!pendingOnly || isPending(statuses[project.path]))
    )
    const byOwner = new Map<string, GitSpreadProject[]>()
    for (const project of visible) {
      const key = project.owner && project.host === 'github.com' ? project.owner : ''
      byOwner.set(key, [...(byOwner.get(key) ?? []), project])
    }
    return [...byOwner.entries()].sort(([a], [b]) =>
      a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, undefined, { sensitivity: 'base' })
    )
  }, [state.projects, statuses, search, pendingOnly])

  return (
    <div className={styles.projects}>
      <label className={`${styles.search} no-drag`}>
        <Search size={14} aria-hidden />
        <input
          type="search"
          value={search}
          placeholder={t('search')}
          aria-label={t('search')}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {state.missingRoots.length > 0 && (
        <p className={styles.warning} title={state.missingRoots.join('\n')}>
          <TriangleAlert size={13} aria-hidden />
          {t('missingRoots', { count: state.missingRoots.length })}
        </p>
      )}
      <div className={styles.scroll}>
        {groups.length === 0 && (
          <p className={styles.empty}>{pendingOnly ? t('nothingPending') : t('noProjects')}</p>
        )}
        {groups.map(([owner, projects]) => (
          <section key={owner || 'unlinked'}>
            <h4 className={styles.groupTitle}>
              {owner || t('unlinked')} <span className={styles.groupCount}>{projects.length}</span>
            </h4>
            <ul className={styles.list}>
              {projects.map((project) => (
                <ProjectRow
                  key={project.path}
                  project={project}
                  status={statuses[project.path]}
                  onOpenFolder={() => onOpenFolder(project.path)}
                  onOpenWeb={() => onOpenWeb(project.path)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function ProjectRow({
  project,
  status,
  onOpenFolder,
  onOpenWeb
}: {
  project: GitSpreadProject
  status: GitProjectStatus | undefined
  onOpenFolder: () => void
  onOpenWeb: () => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const changes = status ? status.staged + status.modified : 0

  const branch = !project.repository
    ? t('notRepository')
    : !status
      ? '…'
      : status.detached
        ? t('detached')
        : (status.branch ?? '?')

  return (
    <li className={styles.row} title={project.path}>
      <div className={styles.rowText}>
        <span className={styles.rowName}>{project.name}</span>
        <span className={styles.rowMeta}>
          <GitBranch size={11} aria-hidden />
          <span className={styles.branch}>{branch}</span>
          {status?.lastFetchAt && (
            <span>
              {' · '}
              {t('fetched', { when: relativeTime(status.lastFetchAt, language) })}
            </span>
          )}
        </span>
      </div>

      <div className={styles.badges}>
        {status?.error ? (
          <span className={styles.badge} data-kind="error" title={status.error}>
            <TriangleAlert size={12} aria-hidden />
            {t('badges.error')}
          </span>
        ) : (
          status && (
            <>
              {status.conflicts > 0 && (
                <Badge kind="error" icon={TriangleAlert} title={t('badges.conflicts')}>
                  {status.conflicts}
                </Badge>
              )}
              {status.ahead > 0 && (
                <Badge
                  kind="push"
                  icon={ArrowUp}
                  title={t('badges.ahead', { count: status.ahead })}
                >
                  {status.ahead}
                </Badge>
              )}
              {status.behind > 0 && (
                <Badge
                  kind="pull"
                  icon={ArrowDown}
                  title={t('badges.behind', { count: status.behind })}
                >
                  {status.behind}
                </Badge>
              )}
              {changes > 0 && (
                <Badge kind="change" title={t('badges.changes', { count: changes })}>
                  ✎ {changes}
                </Badge>
              )}
              {status.untracked > 0 && (
                <Badge kind="change" title={t('badges.untracked', { count: status.untracked })}>
                  + {status.untracked}
                </Badge>
              )}
              {!isPending(status) && project.repository && (
                <span className={styles.clean} title={t('badges.clean')}>
                  <CircleCheck size={14} aria-label={t('badges.clean')} />
                </span>
              )}
              {status.branch && !status.upstream && !status.detached && (
                <Badge kind="muted" title={t('badges.noUpstream')}>
                  {t('badges.local')}
                </Badge>
              )}
            </>
          )
        )}
      </div>

      <div className={`${styles.rowActions} no-drag`}>
        <IconButton icon={FolderOpen} label={t('openFolder')} onClick={onOpenFolder} />
        {project.webUrl && <IconButton icon={Globe} label={t('openWeb')} onClick={onOpenWeb} />}
      </div>
    </li>
  )
}

function Badge({
  kind,
  icon: Icon,
  title,
  children
}: {
  kind: 'push' | 'pull' | 'change' | 'error' | 'muted'
  icon?: LucideIcon
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <span className={styles.badge} data-kind={kind} title={title}>
      {Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  )
}

/** « il y a 3 j », « il y a 5 min »… */
function relativeTime(timestamp: number, language: string): string {
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto', style: 'short' })
  const minutes = Math.round((timestamp - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return format.format(hours, 'hour')
  return format.format(Math.round(hours / 24), 'day')
}

// ---------------------------------------------------------------------------
// GitSpread dans le bloc (application installée)
// ---------------------------------------------------------------------------

function AppView({
  instanceId,
  config,
  setConfig,
  panHandle
}: {
  instanceId: string
  config: GitSpreadConfig
  setConfig: (patch: Partial<GitSpreadConfig>) => void
  panHandle: React.RefObject<HTMLDivElement | null>
}): React.JSX.Element {
  const t = usePluginTranslation()
  const apps = useInstalledApps()
  // Application choisie, sinon celle nommée « GitSpread » dans Paramètres → Applications
  const app =
    apps.find((candidate) => candidate.id === config.appId) ??
    apps.find((candidate) => /gitspread/i.test(candidate.name))

  const add = async (): Promise<void> => {
    const added = await addInstalledApp()
    if (added) setConfig({ appId: added.id, offset: { x: 0, y: 0 } })
  }

  if (!app) {
    return (
      <div className={styles.appEmpty}>
        <AppWindow size={22} aria-hidden />
        <p>{t('appIntro')}</p>
        <Button variant="primary" icon={Plus} className="no-drag" onClick={() => void add()}>
          {t('addApp')}
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.window}>
      <InstalledAppView
        appId={app.id}
        hostId={instanceId}
        offset={config.offset}
        onOffsetChange={(offset) => setConfig({ offset })}
        panHandle={panHandle}
      />
    </div>
  )
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  spin
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  spin?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={`${styles.iconButton} no-drag`}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={16} className={spin ? styles.spin : undefined} aria-hidden />
    </button>
  )
}
