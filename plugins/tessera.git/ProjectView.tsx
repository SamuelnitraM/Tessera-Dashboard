import { useCallback, useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpFromLine,
  Archive,
  ExternalLink,
  FolderOpen,
  GitBranch,
  GitMerge,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
  UploadCloud
} from 'lucide-react'
import {
  Button,
  openContextMenu,
  openMenuBelow,
  useLanguage,
  usePluginTranslation
} from '@tessera/plugin-sdk'
import type {
  GitBranch as Branch,
  GitChange,
  GitCommit,
  GitProject,
  GitProjectStatus,
  GitStash,
  GitState
} from '@shared/git'
import { useConfirm } from './confirm'
import { IssuesTab, PullRequestsTab, RunsTab } from './GitHubViews'
import styles from './GitWidget.module.css'

type Tab = 'changes' | 'branches' | 'history' | 'pulls' | 'issues' | 'runs'

/** Un projet : barre d'actions (récupérer, tirer, pousser…) et onglets. */
export function ProjectView({
  project,
  state,
  status,
  onChanged,
  onSettingsChanged
}: {
  project: GitProject
  state: GitState
  status: GitProjectStatus | null
  onChanged: () => void
  onSettingsChanged: () => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.git
  const [tab, setTab] = useState<Tab>('changes')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [revision, setRevision] = useState(0)
  const github = !!project.webUrl && state.ghInstalled
  const { dialog, ask } = useConfirm()

  /** Lance une action git, montre son résultat et rafraîchit l'état. */
  const run = useCallback(
    (label: string, action: () => Promise<unknown>, done?: string): void => {
      setBusy(label)
      setMessage(null)
      action()
        .then(() => done && setMessage({ text: done, error: false }))
        .catch((failure: Error) => setMessage({ text: failure.message, error: true }))
        .finally(() => {
          setBusy(null)
          setRevision((value) => value + 1)
          onChanged()
        })
    },
    [onChanged]
  )

  if (!project.repository) {
    return (
      <div className={styles.center}>
        <p>{t('notGitHint')}</p>
      </div>
    )
  }

  const tabs: Tab[] = github
    ? ['changes', 'branches', 'history', 'pulls', 'issues', 'runs']
    : ['changes', 'branches', 'history']

  return (
    <div className={styles.projectView}>
      <header className={styles.projectHeader}>
        <div className={styles.projectTitle}>
          <strong>{project.name}</strong>
          {status?.branch && (
            <span className={styles.branch}>
              <GitBranch size={12} aria-hidden /> {status.branch}
              {status.upstream ? '' : ` · ${t('noUpstream')}`}
            </span>
          )}
          {(status?.ahead ?? 0) > 0 && (
            <span className={styles.ahead}>
              <ArrowUp size={12} aria-hidden /> {status?.ahead}
            </span>
          )}
          {(status?.behind ?? 0) > 0 && (
            <span className={styles.behind}>
              <ArrowDown size={12} aria-hidden /> {status?.behind}
            </span>
          )}
        </div>
        <div className={styles.projectActions}>
          <Button
            icon={RefreshCw}
            disabled={busy !== null}
            onClick={() => run('fetch', () => api.network(project.path, 'fetch'), t('fetched'))}
          >
            {t('fetch')}
          </Button>
          <Button
            icon={ArrowDownToLine}
            disabled={busy !== null}
            onClick={() => run('pull', () => api.network(project.path, 'pull'), t('pulled'))}
          >
            {t('pull')}
          </Button>
          <Button
            icon={ArrowUpFromLine}
            disabled={busy !== null}
            onClick={() => run('push', () => api.network(project.path, 'push'), t('pushed'))}
          >
            {t('push')}
          </Button>
          <button
            type="button"
            className={styles.iconButton}
            title={t('more')}
            aria-label={t('more')}
            onClick={openMenuBelow(() => [
              {
                label: t('openFolder'),
                icon: FolderOpen,
                onSelect: () => void api.openFolder(project.path)
              },
              ...(project.webUrl
                ? [
                    {
                      label: t('openGitHub'),
                      icon: ExternalLink,
                      onSelect: () => void api.openUrl(project.webUrl!)
                    }
                  ]
                : []),
              ...(!project.webUrl && state.ghInstalled && state.accounts.length > 0
                ? [
                    {
                      label: t('publish'),
                      icon: UploadCloud,
                      onSelect: () => {
                        const account = project.account ?? state.accounts[0].key
                        ask({
                          title: t('publishTitle', { name: project.name }),
                          message: t('publishMessage', {
                            account: state.accounts.find((item) => item.key === account)?.login
                          }),
                          confirm: t('publish'),
                          danger: false,
                          run: () =>
                            run(
                              'publish',
                              () => api.publish(project.path, account, project.name, true),
                              t('published')
                            )
                        })
                      }
                    }
                  ]
                : []),
              'separator' as const,
              ...state.accounts.map((account) => ({
                label: `${t('useAccount', { login: account.login })}${project.account === account.key ? ' ✓' : ''}`,
                disabled: project.account === account.key,
                onSelect: () =>
                  void api.settings('setAccount', project.path, account.key).then(onSettingsChanged)
              })),
              'separator' as const,
              {
                label: t('hideProject'),
                icon: Trash2,
                danger: true,
                onSelect: () =>
                  ask({
                    title: t('hideProjectTitle', { name: project.name }),
                    message: t('hideProjectMessage'),
                    confirm: t('hideProject'),
                    run: () =>
                      void api.settings('hideProject', project.path).then(onSettingsChanged)
                  })
              }
            ])}
          >
            ⋯
          </button>
        </div>
      </header>

      <nav className={styles.tabs} role="tablist">
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={styles.tab}
            onClick={() => setTab(key)}
          >
            {t(`tab.${key}`)}
          </button>
        ))}
      </nav>

      <div className={styles.tabBody}>
        {tab === 'changes' && (
          <ChangesTab
            project={project}
            revision={revision}
            run={run}
            ask={ask}
            busy={busy !== null}
          />
        )}
        {tab === 'branches' && (
          <BranchesTab project={project} revision={revision} run={run} ask={ask} />
        )}
        {tab === 'history' && <HistoryTab project={project} revision={revision} />}
        {tab === 'pulls' && (
          <PullRequestsTab
            project={project}
            status={status}
            run={run}
            ask={ask}
            revision={revision}
          />
        )}
        {tab === 'issues' && (
          <IssuesTab project={project} run={run} ask={ask} revision={revision} />
        )}
        {tab === 'runs' && <RunsTab project={project} run={run} revision={revision} />}
      </div>

      <footer className={styles.statusBar} data-error={message?.error === true}>
        {busy ? (
          <>
            <LoaderCircle size={13} className={styles.spin} aria-hidden /> {t(`busy.${busy}`)}
          </>
        ) : (
          (message?.text ?? '')
        )}
      </footer>
      {dialog}
    </div>
  )
}

export type Run = (label: string, action: () => Promise<unknown>, done?: string) => void
export type Ask = ReturnType<typeof useConfirm>['ask']

/* ---------- Modifications ---------- */

function ChangesTab({
  project,
  revision,
  run,
  ask,
  busy
}: {
  project: GitProject
  revision: number
  run: Run
  ask: Ask
  busy: boolean
}): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.git
  const [changes, setChanges] = useState<GitChange[] | null>(null)
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set())
  const [shown, setShown] = useState<GitChange | null>(null)
  const [diff, setDiff] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .changes(project.path)
      .then((list) => {
        if (cancelled) return
        setChanges(list)
        setError(null)
      })
      .catch((failure: Error) => !cancelled && setError(failure.message))
    return () => {
      cancelled = true
    }
  }, [api, project.path, revision])

  useEffect(() => {
    if (!shown) return
    let cancelled = false
    void api
      .diff(project.path, shown.path, shown.staged && shown.worktree === ' ')
      .then((text) => !cancelled && setDiff(text))
    return () => {
      cancelled = true
    }
  }, [api, project.path, shown, revision])

  if (error) return <p className={styles.error}>{error}</p>
  if (changes === null) return <p className={styles.muted}>{t('loading')}</p>
  if (changes.length === 0) return <p className={styles.centerText}>{t('clean')}</p>

  const selected = changes
    .filter((change) => !unchecked.has(change.path))
    .map((change) => change.path)
  const commit = (push: boolean): void =>
    run(
      push ? 'commitPush' : 'commit',
      async () => {
        await api.commit(project.path, message, selected)
        if (push) await api.network(project.path, 'push')
        setMessage('')
        setUnchecked(new Set())
      },
      push ? t('committedPushed') : t('committed')
    )

  return (
    <div className={styles.changes}>
      <div className={styles.changeList}>
        <label className={styles.checkAll}>
          <input
            type="checkbox"
            checked={unchecked.size === 0}
            onChange={(event) =>
              setUnchecked(
                event.target.checked ? new Set() : new Set(changes.map((change) => change.path))
              )
            }
          />
          {t('changesCount', { count: changes.length })}
        </label>
        <ul>
          {changes.map((change) => {
            const letter = change.untracked
              ? 'U'
              : change.conflict
                ? '!'
                : change.index !== ' '
                  ? change.index
                  : change.worktree
            return (
              <li
                key={change.path}
                data-active={shown?.path === change.path}
                onContextMenu={openContextMenu([
                  {
                    label: t('discard'),
                    icon: Undo2,
                    danger: true,
                    onSelect: () =>
                      ask({
                        title: t('discardTitle'),
                        message: t('discardMessage', { name: change.path }),
                        confirm: t('discard'),
                        run: () => run('discard', () => api.discard(project.path, [change.path]))
                      })
                  }
                ])}
              >
                <input
                  type="checkbox"
                  checked={!unchecked.has(change.path)}
                  aria-label={change.path}
                  onChange={(event) => {
                    const next = new Set(unchecked)
                    if (event.target.checked) next.delete(change.path)
                    else next.add(change.path)
                    setUnchecked(next)
                  }}
                />
                <button
                  type="button"
                  className={styles.changeName}
                  onClick={() => setShown(change)}
                >
                  <span className={styles.letter} data-kind={letter}>
                    {letter}
                  </span>
                  <span title={change.from ? `${change.from} → ${change.path}` : change.path}>
                    {change.path}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className={styles.commitBox}>
          <textarea
            value={message}
            placeholder={t('commitMessage')}
            aria-label={t('commitMessage')}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && event.ctrlKey && message.trim() && selected.length > 0)
                commit(false)
            }}
          />
          <div className={styles.row}>
            <Button
              variant="primary"
              disabled={busy || !message.trim() || selected.length === 0}
              onClick={() => commit(false)}
            >
              {t('commit', { count: selected.length })}
            </Button>
            <Button
              disabled={busy || !message.trim() || selected.length === 0}
              onClick={() => commit(true)}
            >
              {t('commitPush')}
            </Button>
            <button
              type="button"
              className={styles.linkButton}
              disabled={selected.length === 0}
              onClick={() =>
                ask({
                  title: t('discardTitle'),
                  message: t('discardManyMessage', { count: selected.length }),
                  confirm: t('discard'),
                  run: () => run('discard', () => api.discard(project.path, selected))
                })
              }
            >
              {t('discardSelected')}
            </button>
          </div>
        </div>
      </div>
      <pre className={styles.diff}>
        {shown ? (
          diff.split('\n').map((line, index) => (
            <span
              key={index}
              data-kind={
                line.startsWith('+') && !line.startsWith('+++')
                  ? 'add'
                  : line.startsWith('-') && !line.startsWith('---')
                    ? 'remove'
                    : line.startsWith('@@')
                      ? 'hunk'
                      : undefined
              }
            >
              {line}
              {'\n'}
            </span>
          ))
        ) : (
          <span className={styles.muted}>{t('chooseFile')}</span>
        )}
      </pre>
    </div>
  )
}

/* ---------- Branches et remise de côté ---------- */

function BranchesTab({
  project,
  revision,
  run,
  ask
}: {
  project: GitProject
  revision: number
  run: Run
  ask: Ask
}): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.git
  const [branches, setBranches] = useState<Branch[] | null>(null)
  const [stashes, setStashes] = useState<GitStash[]>([])
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    void api.branches(project.path).then((list) => !cancelled && setBranches(list))
    void api.stash(project.path, 'list').then((list) => !cancelled && setStashes(list))
    return () => {
      cancelled = true
    }
  }, [api, project.path, revision])

  if (branches === null) return <p className={styles.muted}>{t('loading')}</p>
  const current = branches.find((branch) => branch.current)

  const branchMenu = (branch: Branch) => [
    {
      label: t('switchBranch'),
      icon: GitBranch,
      disabled: branch.current,
      onSelect: () => run('switch', () => api.branchAction(project.path, 'switch', branch.name))
    },
    ...(branch.remote
      ? []
      : [
          {
            label: t('mergeInto', { branch: current?.name ?? '' }),
            icon: GitMerge,
            disabled: branch.current,
            onSelect: () =>
              ask({
                title: t('mergeTitle'),
                message: t('mergeMessage', { from: branch.name, into: current?.name ?? '' }),
                confirm: t('merge'),
                danger: false,
                run: () => run('merge', () => api.branchAction(project.path, 'merge', branch.name))
              })
          },
          {
            label: t('rename'),
            icon: Pencil,
            onSelect: () => setRenaming({ from: branch.name, to: branch.name })
          },
          {
            label: t('deleteBranch'),
            icon: Trash2,
            danger: true,
            disabled: branch.current,
            onSelect: () =>
              ask({
                title: t('deleteBranchTitle', { name: branch.name }),
                message: t('deleteBranchMessage'),
                confirm: t('deleteBranch'),
                run: () =>
                  run('delete', () => api.branchAction(project.path, 'delete', branch.name, false))
              })
          }
        ])
  ]

  const list = (remote: boolean): React.JSX.Element => (
    <ul className={styles.branchList}>
      {branches
        .filter((branch) => branch.remote === remote)
        .map((branch) => (
          <li
            key={branch.name}
            data-current={branch.current}
            onContextMenu={openContextMenu(() => branchMenu(branch))}
          >
            {renaming?.from === branch.name ? (
              <form
                className={styles.inlineForm}
                onSubmit={(event) => {
                  event.preventDefault()
                  const target = renaming.to.trim()
                  setRenaming(null)
                  if (target && target !== branch.name) {
                    run('rename', () =>
                      api.branchAction(project.path, 'rename', branch.name, target)
                    )
                  }
                }}
              >
                <input
                  autoFocus
                  value={renaming.to}
                  onChange={(event) => setRenaming({ ...renaming, to: event.target.value })}
                  onBlur={() => setRenaming(null)}
                  onKeyDown={(event) => event.key === 'Escape' && setRenaming(null)}
                />
              </form>
            ) : (
              <button
                type="button"
                className={styles.branchName}
                title={t('switchBranch')}
                onDoubleClick={() =>
                  !branch.current &&
                  run('switch', () => api.branchAction(project.path, 'switch', branch.name))
                }
                onClick={openMenuBelow(() => branchMenu(branch))}
              >
                <GitBranch size={13} aria-hidden />
                <span>{branch.name}</span>
                {branch.current && <span className={styles.badge}>{t('current')}</span>}
              </button>
            )}
            <span className={styles.muted}>
              {branch.ahead > 0 && `↑${branch.ahead} `}
              {branch.behind > 0 && `↓${branch.behind}`}
            </span>
          </li>
        ))}
    </ul>
  )

  return (
    <div className={styles.branches}>
      <form
        className={styles.row}
        onSubmit={(event) => {
          event.preventDefault()
          const branch = name.trim()
          if (!branch) return
          setName('')
          run(
            'create',
            () => api.branchAction(project.path, 'create', branch),
            t('branchCreated', { name: branch })
          )
        }}
      >
        <input
          className={styles.input}
          value={name}
          placeholder={t('newBranch')}
          aria-label={t('newBranch')}
          onChange={(event) => setName(event.target.value)}
        />
        <Button icon={Plus} type="submit" disabled={!name.trim()}>
          {t('create')}
        </Button>
      </form>
      <h4>{t('localBranches')}</h4>
      {list(false)}
      <h4>{t('remoteBranches')}</h4>
      {list(true)}
      <h4>{t('stashes')}</h4>
      <div className={styles.row}>
        <Button
          icon={Archive}
          onClick={() => run('stash', () => api.stash(project.path, 'push'), t('stashed'))}
        >
          {t('stashPush')}
        </Button>
      </div>
      {stashes.length === 0 ? (
        <p className={styles.muted}>{t('noStash')}</p>
      ) : (
        <ul className={styles.branchList}>
          {stashes.map((stash) => (
            <li key={stash.index}>
              <span className={styles.branchName}>{stash.message}</span>
              <Button
                onClick={() => run('stashPop', () => api.stash(project.path, 'pop', stash.index))}
              >
                {t('stashPop')}
              </Button>
              <button
                type="button"
                className={styles.iconButton}
                title={t('stashDrop')}
                aria-label={t('stashDrop')}
                onClick={() =>
                  ask({
                    title: t('stashDrop'),
                    message: t('stashDropMessage'),
                    confirm: t('stashDrop'),
                    run: () => run('stashDrop', () => api.stash(project.path, 'drop', stash.index))
                  })
                }
              >
                <Trash2 size={13} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------- Historique ---------- */

function HistoryTab({
  project,
  revision
}: {
  project: GitProject
  revision: number
}): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const api = window.tessera.git
  const [all, setAll] = useState(false)
  const [commits, setCommits] = useState<GitCommit[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void api
      .log(project.path, all, 300)
      .then((list) => !cancelled && setCommits(list))
      .catch(() => !cancelled && setCommits([]))
    return () => {
      cancelled = true
    }
  }, [api, project.path, all, revision])

  const format = new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'short' })
  return (
    <div className={styles.history}>
      <label className={styles.checkAll}>
        <input type="checkbox" checked={all} onChange={(event) => setAll(event.target.checked)} />
        {t('allBranches')}
      </label>
      {commits === null ? (
        <p className={styles.muted}>{t('loading')}</p>
      ) : commits.length === 0 ? (
        <p className={styles.muted}>{t('noCommits')}</p>
      ) : (
        <ol className={styles.commitList}>
          {commits.map((commit) => (
            <li
              key={commit.hash}
              onContextMenu={openContextMenu([
                {
                  label: t('copyHash'),
                  onSelect: () => void navigator.clipboard.writeText(commit.hash)
                },
                ...(project.webUrl
                  ? [
                      {
                        label: t('openCommit'),
                        icon: ExternalLink,
                        onSelect: () => void api.openUrl(`${project.webUrl}/commit/${commit.hash}`)
                      }
                    ]
                  : [])
              ])}
            >
              <span
                className={styles.graphDot}
                data-merge={commit.parents.length > 1}
                aria-hidden
              />
              <span className={styles.commitText}>
                <span>
                  {commit.refs.map((ref) => (
                    <span key={ref} className={styles.ref} data-head={ref.startsWith('→')}>
                      {ref}
                    </span>
                  ))}
                  {commit.subject}
                </span>
                <span className={styles.muted}>
                  {commit.short} · {commit.author} · {format.format(commit.date)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
