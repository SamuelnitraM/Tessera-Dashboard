import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  FolderGit2,
  FolderPlus,
  GitBranch,
  LibraryBig,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  X
} from 'lucide-react'
import { Button, usePluginTranslation, type WidgetProps } from '@tessera/plugin-sdk'
import type { GitProject, GitProjectStatus, GitState } from '@shared/git'
import { Repositories } from './GitHubViews'
import { ProjectView } from './ProjectView'
import styles from './GitWidget.module.css'

interface GitConfig {
  project?: string
  /** `project`, `repos:<compte>` ou `settings`. */
  view?: string
}

const STATUS_MS = 20_000

/**
 * Module Git : les projets de GitSpread rangés par compte, et pour chacun ses modifications,
 * branches, historique, pull requests, issues et GitHub Actions ; les dépôts de chaque compte.
 */
export function GitWidget({ config, setConfig }: WidgetProps<GitConfig>): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.git
  const [state, setState] = useState<GitState | null>(null)
  const [statuses, setStatuses] = useState<Record<string, GitProjectStatus>>({})
  const [query, setQuery] = useState('')
  const [wide, setWide] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const view = config.view ?? 'project'

  const load = useCallback(
    (force = false) => {
      api
        .state(force)
        .then((next) => {
          setState(next)
          setError(null)
        })
        .catch((failure: Error) => setError(failure.message))
    },
    [api]
  )

  useEffect(() => load(), [load])

  const paths = useMemo(
    () => (state?.projects ?? []).filter((item) => item.repository).map((item) => item.path),
    [state]
  )
  const refreshStatuses = useCallback(() => {
    if (paths.length === 0) return
    void api
      .statuses(paths)
      .then((list) => setStatuses(Object.fromEntries(list.map((item) => [item.path, item]))))
      .catch(() => undefined)
  }, [api, paths])

  useEffect(() => {
    refreshStatuses()
    const timer = window.setInterval(() => !document.hidden && refreshStatuses(), STATUS_MS)
    return () => window.clearInterval(timer)
  }, [refreshStatuses])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 700))
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const groups = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const visible = (state?.projects ?? []).filter((item) =>
      words.every((word) => `${item.name} ${item.owner ?? ''}`.toLowerCase().includes(word))
    )
    const byAccount = new Map<string, GitProject[]>()
    for (const item of visible) {
      const key = item.account ?? ''
      byAccount.set(key, [...(byAccount.get(key) ?? []), item])
    }
    return [...byAccount.entries()].sort(([a], [b]) => (a ? (b ? a.localeCompare(b) : -1) : 1))
  }, [state, query])

  const selected = state?.projects.find((item) => item.path === config.project) ?? null
  const showList = wide || (view === 'project' && !selected)

  if (state && !state.gitInstalled) {
    return (
      <div className={styles.center}>
        <FolderGit2 size={28} aria-hidden />
        <p>{t('noGit')}</p>
      </div>
    )
  }

  const accountLabel = (key: string): string =>
    state?.accounts.find((account) => account.key === key)?.login ?? key

  return (
    <div ref={rootRef} className={styles.git}>
      {showList && (
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTools}>
            <label className={styles.search}>
              <Search size={13} aria-hidden />
              <input
                value={query}
                placeholder={t('searchProjects')}
                aria-label={t('searchProjects')}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              type="button"
              className={styles.iconButton}
              title={t('refresh')}
              aria-label={t('refresh')}
              onClick={() => {
                load(true)
                refreshStatuses()
              }}
            >
              <RefreshCw size={14} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              data-active={view === 'settings'}
              title={t('settings')}
              aria-label={t('settings')}
              onClick={() => setConfig({ view: view === 'settings' ? 'project' : 'settings' })}
            >
              <Settings2 size={14} aria-hidden />
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          {state === null ? (
            <p className={styles.muted}>{t('loading')}</p>
          ) : state.projects.length === 0 ? (
            <div className={styles.emptyList}>
              <p>{t('noProjects')}</p>
              <Button icon={FolderPlus} onClick={() => setConfig({ view: 'settings' })}>
                {t('addFolder')}
              </Button>
            </div>
          ) : (
            <div className={styles.projectList}>
              {groups.map(([account, projects]) => (
                <section key={account || 'none'}>
                  <header className={styles.groupHeader}>
                    <span>{account ? accountLabel(account) : t('noAccount')}</span>
                    {account && state.ghInstalled && (
                      <button
                        type="button"
                        className={styles.linkButton}
                        data-active={view === `repos:${account}`}
                        onClick={() => setConfig({ view: `repos:${account}` })}
                      >
                        <LibraryBig size={12} aria-hidden /> {t('repositories')}
                      </button>
                    )}
                  </header>
                  <ul>
                    {projects.map((item) => {
                      const status = statuses[item.path]
                      const changes = status
                        ? status.staged + status.modified + status.untracked + status.conflicts
                        : 0
                      return (
                        <li key={item.path}>
                          <button
                            type="button"
                            className={styles.project}
                            data-active={view === 'project' && item.path === config.project}
                            title={item.path}
                            onClick={() => setConfig({ project: item.path, view: 'project' })}
                          >
                            <span className={styles.projectName}>{item.name}</span>
                            <span className={styles.projectMeta}>
                              {status?.error ? (
                                <span className={styles.errorDot} title={status.error}>
                                  !
                                </span>
                              ) : (
                                <>
                                  {status?.branch && (
                                    <span className={styles.branch}>
                                      <GitBranch size={11} aria-hidden />
                                      {status.branch}
                                    </span>
                                  )}
                                  {changes > 0 && (
                                    <span className={styles.changes}>● {changes}</span>
                                  )}
                                  {(status?.ahead ?? 0) > 0 && (
                                    <span className={styles.ahead}>
                                      <ArrowUp size={11} aria-hidden />
                                      {status?.ahead}
                                    </span>
                                  )}
                                  {(status?.behind ?? 0) > 0 && (
                                    <span className={styles.behind}>
                                      <ArrowDown size={11} aria-hidden />
                                      {status?.behind}
                                    </span>
                                  )}
                                </>
                              )}
                              {!item.repository && (
                                <span className={styles.muted}>{t('notGit')}</span>
                              )}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </aside>
      )}

      {(wide || !showList) && (
        <main className={styles.main}>
          {!wide && (
            <button
              type="button"
              className={styles.backButton}
              onClick={() => setConfig({ project: undefined, view: 'project' })}
            >
              ← {t('projects')}
            </button>
          )}
          {view === 'settings' && state ? (
            <GitSettings state={state} onChange={() => load(true)} />
          ) : view.startsWith('repos:') && state ? (
            <Repositories
              accountKey={view.slice('repos:'.length)}
              state={state}
              onCloned={(path) => {
                load(true)
                setConfig({ project: path, view: 'project' })
              }}
            />
          ) : selected && state ? (
            <ProjectView
              key={selected.path}
              project={selected}
              state={state}
              status={statuses[selected.path] ?? null}
              onChanged={refreshStatuses}
              onSettingsChanged={() => load(true)}
            />
          ) : (
            <div className={styles.center}>
              <FolderGit2 size={28} aria-hidden />
              <p>{t('chooseProject')}</p>
            </div>
          )}
        </main>
      )}
    </div>
  )
}

/** Dossiers analysés, projets ajoutés, outils et comptes (réglages partagés avec GitSpread). */
function GitSettings({
  state,
  onChange
}: {
  state: GitState
  onChange: () => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.git
  const [error, setError] = useState<string | null>(null)
  const act = (promise: Promise<unknown>): void =>
    void promise.then(onChange).catch((failure: Error) => setError(failure.message))
  const pick = (action: 'addRoot' | 'addProject' | 'cloneFolder'): void =>
    void window.tessera.files.pickFolder().then((path) => {
      if (path) act(api.settings(action, path))
    })

  return (
    <div className={styles.settings}>
      <h3>{t('settings')}</h3>
      <p className={styles.muted}>{t('settingsIntro')}</p>
      {error && <p className={styles.error}>{error}</p>}

      <h4>{t('roots')}</h4>
      <ul className={styles.settingList}>
        {state.roots.map((root) => (
          <li key={root}>
            <span title={root} data-missing={state.missingRoots.includes(root)}>
              {root}
            </span>
            <button
              type="button"
              className={styles.iconButton}
              title={t('removeRoot')}
              aria-label={t('removeRoot')}
              onClick={() => act(api.settings('removeRoot', root))}
            >
              <X size={13} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.row}>
        <Button icon={FolderPlus} onClick={() => pick('addRoot')}>
          {t('addFolder')}
        </Button>
        <Button icon={FolderGit2} onClick={() => pick('addProject')}>
          {t('addProject')}
        </Button>
      </div>

      <h4>{t('cloneFolder')}</h4>
      <div className={styles.row}>
        <code>{state.cloneFolder ?? t('cloneFolderUnset')}</code>
        <Button onClick={() => pick('cloneFolder')}>{t('choose')}</Button>
      </div>

      <h4>{t('accounts')}</h4>
      {!state.ghInstalled ? (
        <p className={styles.muted}>{t('noGh')}</p>
      ) : state.accounts.length === 0 ? (
        <p className={styles.muted}>{t('noAccounts')}</p>
      ) : (
        <ul className={styles.settingList}>
          {state.accounts.map((account) => (
            <li key={account.key}>
              <span>
                {account.login} <span className={styles.muted}>({account.host})</span>
              </span>
              {account.active && <span className={styles.badge}>{t('activeAccount')}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.footnote}>{t('accountsHint')}</p>
      {state.missingRoots.length > 0 && (
        <p className={styles.footnote}>
          <Trash2 size={11} aria-hidden /> {t('missingRoots', { count: state.missingRoots.length })}
        </p>
      )}
    </div>
  )
}
