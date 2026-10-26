import { useEffect, useState } from 'react'
import {
  Archive,
  CircleCheck,
  CircleDot,
  CircleX,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  GitMerge,
  GitPullRequest,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react'
import {
  Button,
  openMenuBelow,
  useLanguage,
  usePluginTranslation,
  type MenuItem
} from '@tessera/plugin-sdk'
import type {
  GitHubCollaborator,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepository,
  GitHubRun,
  GitProject,
  GitProjectStatus,
  GitState
} from '@shared/git'
import { useConfirm } from './confirm'
import type { Ask, Run } from './ProjectView'
import styles from './GitWidget.module.css'

/** Liste chargée depuis GitHub, rechargée à chaque action. */
function useList<T>(
  load: () => Promise<T[]>,
  deps: unknown[]
): { list: T[] | null; error: string | null } {
  const [list, setList] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    // La liste précédente reste affichée pendant le rechargement
    let cancelled = false
    load()
      .then((result) => {
        if (cancelled) return
        setList(result)
        setError(null)
      })
      .catch((failure: Error) => !cancelled && setError(failure.message))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rechargement décidé par l'appelant
  }, deps)
  return { list, error }
}

function useRelative(): (date: string) => string {
  const language = useLanguage()
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
  return (date) => {
    const minutes = Math.round((new Date(date).getTime() - Date.now()) / 60_000)
    if (Math.abs(minutes) < 60) return format.format(minutes, 'minute')
    const hours = Math.round(minutes / 60)
    if (Math.abs(hours) < 24) return format.format(hours, 'hour')
    return format.format(Math.round(hours / 24), 'day')
  }
}

function ListState({
  error,
  loading
}: {
  error: string | null
  loading: boolean
}): React.JSX.Element | null {
  const t = usePluginTranslation()
  if (error) return <p className={styles.error}>{error}</p>
  if (loading) return <p className={styles.muted}>{t('loading')}</p>
  return null
}

/* ---------- Pull requests ---------- */

export function PullRequestsTab({
  project,
  status,
  run,
  ask,
  revision
}: {
  project: GitProject
  status: GitProjectStatus | null
  run: Run
  ask: Ask
  revision: number
}): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.git
  const relative = useRelative()
  const { list, error } = useList(() => api.pullRequests(project.path), [project.path, revision])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', base: '', draft: false })

  const actions = (pull: GitHubPullRequest): MenuItem[] => [
    { label: t('openGitHub'), icon: ExternalLink, onSelect: () => void api.openUrl(pull.url) },
    {
      label: t('checkout'),
      icon: Download,
      onSelect: () =>
        run('checkout', () => api.pullRequestAction(project.path, pull.number, 'checkout'))
    },
    ...(pull.draft
      ? [
          {
            label: t('markReady'),
            icon: CircleCheck,
            onSelect: () =>
              run('ready', () => api.pullRequestAction(project.path, pull.number, 'ready'))
          }
        ]
      : []),
    {
      label: t('mergePull'),
      icon: GitMerge,
      onSelect: () =>
        ask({
          title: t('mergePullTitle', { number: pull.number }),
          message: t('mergePullMessage', { head: pull.head, base: pull.base }),
          confirm: t('mergePull'),
          danger: false,
          run: () =>
            run(
              'merge',
              () => api.pullRequestAction(project.path, pull.number, 'merge'),
              t('merged')
            )
        })
    },
    {
      label: t('squashPull'),
      icon: GitMerge,
      onSelect: () =>
        ask({
          title: t('mergePullTitle', { number: pull.number }),
          message: t('squashPullMessage', { head: pull.head, base: pull.base }),
          confirm: t('squashPull'),
          danger: false,
          run: () =>
            run(
              'merge',
              () => api.pullRequestAction(project.path, pull.number, 'squash'),
              t('merged')
            )
        })
    },
    'separator',
    {
      label: t('closePull'),
      icon: X,
      danger: true,
      onSelect: () =>
        ask({
          title: t('closePullTitle', { number: pull.number }),
          message: pull.title,
          confirm: t('closePull'),
          run: () => run('close', () => api.pullRequestAction(project.path, pull.number, 'close'))
        })
    }
  ]

  return (
    <div className={styles.github}>
      <div className={styles.row}>
        <Button icon={Plus} onClick={() => setCreating(!creating)}>
          {t('newPull', { branch: status?.branch ?? '' })}
        </Button>
      </div>
      {creating && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            setCreating(false)
            run(
              'createPull',
              async () => {
                const url = await api.createPullRequest(project.path, form)
                if (url.startsWith('https://')) void api.openUrl(url)
                setForm({ title: '', body: '', base: '', draft: false })
              },
              t('pullCreated')
            )
          }}
        >
          <input
            className={styles.input}
            value={form.title}
            placeholder={t('title')}
            aria-label={t('title')}
            required
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <textarea
            className={styles.input}
            value={form.body}
            placeholder={t('description')}
            aria-label={t('description')}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
          <div className={styles.row}>
            <input
              className={styles.input}
              value={form.base}
              placeholder={t('baseBranch')}
              aria-label={t('baseBranch')}
              onChange={(event) => setForm({ ...form, base: event.target.value })}
            />
            <label className={styles.checkAll}>
              <input
                type="checkbox"
                checked={form.draft}
                onChange={(event) => setForm({ ...form, draft: event.target.checked })}
              />
              {t('draft')}
            </label>
            <Button variant="primary" icon={Send} type="submit">
              {t('create')}
            </Button>
          </div>
          <p className={styles.footnote}>{t('pullHint')}</p>
        </form>
      )}
      <ListState error={error} loading={list === null} />
      {list?.length === 0 && <p className={styles.muted}>{t('noPulls')}</p>}
      <ul className={styles.itemList}>
        {list?.map((pull) => (
          <li key={pull.number}>
            <GitPullRequest
              size={15}
              className={styles.itemIcon}
              data-draft={pull.draft}
              aria-hidden
            />
            <button
              type="button"
              className={styles.itemText}
              onClick={openMenuBelow(() => actions(pull))}
            >
              <strong>
                #{pull.number} {pull.title}
              </strong>
              <span className={styles.muted}>
                {pull.head} → {pull.base} · {pull.author} · {relative(pull.updatedAt)}
                {pull.draft ? ` · ${t('draft')}` : ''}
                {pull.review ? ` · ${t(`review.${pull.review}`)}` : ''}
              </span>
            </button>
            {pull.checks && <Checks state={pull.checks} />}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Checks({ state }: { state: 'success' | 'failure' | 'pending' }): React.JSX.Element {
  const t = usePluginTranslation()
  if (state === 'success')
    return <CircleCheck size={15} className={styles.ok} aria-label={t('checksOk')} />
  if (state === 'failure')
    return <CircleX size={15} className={styles.ko} aria-label={t('checksFailed')} />
  return <LoaderCircle size={15} className={styles.pending} aria-label={t('checksPending')} />
}

/* ---------- Issues ---------- */

export function IssuesTab({
  project,
  run,
  ask,
  revision
}: {
  project: GitProject
  run: Run
  ask: Ask
  revision: number
}): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.git
  const relative = useRelative()
  const [state, setState] = useState<'open' | 'closed'>('open')
  const { list, error } = useList(
    () => api.issues(project.path, state),
    [project.path, state, revision]
  )
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', body: '' })

  return (
    <div className={styles.github}>
      <div className={styles.row}>
        <Button icon={Plus} onClick={() => setCreating(!creating)}>
          {t('newIssue')}
        </Button>
        <select
          className={styles.select}
          value={state}
          aria-label={t('issueState')}
          onChange={(event) => setState(event.target.value as 'open' | 'closed')}
        >
          <option value="open">{t('openIssues')}</option>
          <option value="closed">{t('closedIssues')}</option>
        </select>
      </div>
      {creating && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            setCreating(false)
            run(
              'createIssue',
              async () => {
                await api.issueAction(project.path, 'create', form)
                setForm({ title: '', body: '' })
              },
              t('issueCreated')
            )
          }}
        >
          <input
            className={styles.input}
            value={form.title}
            placeholder={t('title')}
            aria-label={t('title')}
            required
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <textarea
            className={styles.input}
            value={form.body}
            placeholder={t('description')}
            aria-label={t('description')}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
          <div className={styles.row}>
            <Button variant="primary" icon={Send} type="submit">
              {t('create')}
            </Button>
          </div>
        </form>
      )}
      <ListState error={error} loading={list === null} />
      {list?.length === 0 && <p className={styles.muted}>{t('noIssues')}</p>}
      <ul className={styles.itemList}>
        {list?.map((issue: GitHubIssue) => (
          <li key={issue.number}>
            <CircleDot
              size={15}
              className={issue.state === 'OPEN' ? styles.ok : styles.mutedIcon}
              aria-hidden
            />
            <button
              type="button"
              className={styles.itemText}
              onClick={openMenuBelow([
                {
                  label: t('openGitHub'),
                  icon: ExternalLink,
                  onSelect: () => void api.openUrl(issue.url)
                },
                issue.state === 'OPEN'
                  ? {
                      label: t('closeIssue'),
                      icon: X,
                      danger: true,
                      onSelect: () =>
                        ask({
                          title: t('closeIssueTitle', { number: issue.number }),
                          message: issue.title,
                          confirm: t('closeIssue'),
                          run: () =>
                            run('close', () =>
                              api.issueAction(project.path, 'close', { number: issue.number })
                            )
                        })
                    }
                  : {
                      label: t('reopenIssue'),
                      icon: RotateCw,
                      onSelect: () =>
                        run('reopen', () =>
                          api.issueAction(project.path, 'reopen', { number: issue.number })
                        )
                    }
              ])}
            >
              <strong>
                #{issue.number} {issue.title}
              </strong>
              <span className={styles.muted}>
                {issue.author} · {relative(issue.updatedAt)}
                {issue.labels.map((label) => (
                  <span key={label} className={styles.label}>
                    {label}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- GitHub Actions ---------- */

export function RunsTab({
  project,
  run,
  revision
}: {
  project: GitProject
  run: Run
  revision: number
}): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.git
  const relative = useRelative()
  const [tick, setTick] = useState(0)
  const { list, error } = useList(() => api.runs(project.path), [project.path, revision, tick])

  // Exécutions en cours : la liste se recharge toute seule
  const active = list?.some((item) => item.status !== 'completed') ?? false
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => setTick((value) => value + 1), 15_000)
    return () => window.clearTimeout(timer)
  }, [active, list])

  const icon = (item: GitHubRun): React.JSX.Element =>
    item.status !== 'completed' ? (
      <LoaderCircle size={15} className={styles.pending} aria-hidden />
    ) : item.conclusion === 'success' ? (
      <CircleCheck size={15} className={styles.ok} aria-hidden />
    ) : item.conclusion === 'skipped' || item.conclusion === 'cancelled' ? (
      <CircleDot size={15} className={styles.mutedIcon} aria-hidden />
    ) : (
      <CircleX size={15} className={styles.ko} aria-hidden />
    )

  return (
    <div className={styles.github}>
      <ListState error={error} loading={list === null} />
      {list?.length === 0 && <p className={styles.muted}>{t('noRuns')}</p>}
      <ul className={styles.itemList}>
        {list?.map((item) => (
          <li key={item.id}>
            {icon(item)}
            <button
              type="button"
              className={styles.itemText}
              onClick={openMenuBelow([
                {
                  label: t('openGitHub'),
                  icon: ExternalLink,
                  onSelect: () => void api.openUrl(item.url)
                },
                {
                  label: t('rerunFailed'),
                  icon: RotateCw,
                  disabled: item.status !== 'completed' || item.conclusion === 'success',
                  onSelect: () =>
                    run(
                      'rerun',
                      () => api.runAction(project.path, item.id, 'rerun'),
                      t('rerunStarted')
                    )
                },
                {
                  label: t('cancelRun'),
                  icon: X,
                  disabled: item.status === 'completed',
                  onSelect: () =>
                    run('cancel', () => api.runAction(project.path, item.id, 'cancel'))
                }
              ])}
            >
              <strong>{item.title}</strong>
              <span className={styles.muted}>
                {item.workflow} · {item.branch} · {item.event} · {relative(item.createdAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- Dépôts d'un compte ---------- */

export function Repositories({
  accountKey,
  state,
  onCloned
}: {
  accountKey: string
  state: GitState
  onCloned: (path: string) => void
}): React.JSX.Element {
  const t = usePluginTranslation()
  const api = window.tessera.git
  const relative = useRelative()
  const [revision, setRevision] = useState(0)
  const { list, error } = useList(() => api.repositories(accountKey), [accountKey, revision])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [team, setTeam] = useState<{ repo: string; list: GitHubCollaborator[] | null } | null>(null)
  const [invite, setInvite] = useState('')
  const [renaming, setRenaming] = useState<{ repo: string; name: string } | null>(null)
  const { dialog, ask } = useConfirm()
  const account = state.accounts.find((item) => item.key === accountKey)

  const act = (label: string, action: () => Promise<unknown>, done?: string): void => {
    setBusy(label)
    setMessage(null)
    action()
      .then(() => done && setMessage({ text: done, error: false }))
      .catch((failure: Error) => setMessage({ text: failure.message, error: true }))
      .finally(() => {
        setBusy(null)
        setRevision((value) => value + 1)
      })
  }

  const clone = (repo: GitHubRepository): void => {
    const target = state.cloneFolder
    const start = (folder: string): void => {
      setBusy('clone')
      setMessage(null)
      api
        .clone(accountKey, repo.nameWithOwner, folder)
        .then(onCloned)
        .catch((failure: Error) => setMessage({ text: failure.message, error: true }))
        .finally(() => setBusy(null))
    }
    if (target) start(target)
    else
      void window.tessera.files.pickFolder().then((folder) => {
        if (folder) start(folder)
      })
  }

  const openTeam = (repo: string): void => {
    setTeam({ repo, list: null })
    void api
      .collaborators(accountKey, repo, 'list')
      .then((list) => setTeam({ repo, list }))
      .catch((failure: Error) => {
        setTeam(null)
        setMessage({ text: failure.message, error: true })
      })
  }

  const menu = (repo: GitHubRepository): MenuItem[] => [
    { label: t('openGitHub'), icon: ExternalLink, onSelect: () => void api.openUrl(repo.url) },
    { label: t('clone'), icon: Download, disabled: !!repo.localPath, onSelect: () => clone(repo) },
    ...(repo.collaborator
      ? []
      : ([
          { label: t('collaborators'), icon: Users, onSelect: () => openTeam(repo.nameWithOwner) },
          {
            label: repo.visibility === 'PRIVATE' ? t('makePublic') : t('makePrivate'),
            icon: repo.visibility === 'PRIVATE' ? Eye : EyeOff,
            onSelect: () =>
              ask({
                title: repo.visibility === 'PRIVATE' ? t('makePublic') : t('makePrivate'),
                message: t('visibilityMessage', { repo: repo.nameWithOwner }),
                confirm: t('confirm'),
                run: () =>
                  act(
                    'visibility',
                    () =>
                      api.repositoryAction(
                        accountKey,
                        repo.nameWithOwner,
                        'visibility',
                        repo.visibility === 'PRIVATE' ? 'public' : 'private'
                      ),
                    t('done')
                  )
              })
          },
          {
            label: t('renameRepo'),
            icon: Pencil,
            onSelect: () => setRenaming({ repo: repo.nameWithOwner, name: repo.name })
          },
          {
            label: repo.archived ? t('unarchive') : t('archive'),
            icon: Archive,
            onSelect: () =>
              ask({
                title: repo.archived ? t('unarchive') : t('archive'),
                message: t(repo.archived ? 'unarchiveMessage' : 'archiveMessage', {
                  repo: repo.nameWithOwner
                }),
                confirm: t('confirm'),
                danger: !repo.archived,
                run: () =>
                  act(
                    'archive',
                    () =>
                      api.repositoryAction(
                        accountKey,
                        repo.nameWithOwner,
                        repo.archived ? 'unarchive' : 'archive'
                      ),
                    t('done')
                  )
              })
          },
          'separator',
          {
            label: t('deleteRepo'),
            icon: Trash2,
            danger: true,
            onSelect: () =>
              ask({
                title: t('deleteRepoTitle', { repo: repo.nameWithOwner }),
                message: t('deleteRepoMessage'),
                confirm: t('deleteRepo'),
                run: () =>
                  act(
                    'delete',
                    () => api.repositoryAction(accountKey, repo.nameWithOwner, 'delete'),
                    t('done')
                  )
              })
          }
        ] as MenuItem[]))
  ]

  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const visible = (list ?? []).filter((repo) =>
    words.every((word) => `${repo.nameWithOwner} ${repo.description}`.toLowerCase().includes(word))
  )

  return (
    <div className={styles.repositories}>
      <header className={styles.projectHeader}>
        <div className={styles.projectTitle}>
          <strong>{t('repositoriesOf', { login: account?.login ?? accountKey })}</strong>
        </div>
        <label className={styles.search}>
          <Search size={13} aria-hidden />
          <input
            value={query}
            placeholder={t('searchRepos')}
            aria-label={t('searchRepos')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </header>
      {renaming && (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            const { repo, name } = renaming
            setRenaming(null)
            act(
              'rename',
              () => api.repositoryAction(accountKey, repo, 'rename', name.trim()),
              t('done')
            )
          }}
        >
          <div className={styles.row}>
            <input
              className={styles.input}
              autoFocus
              value={renaming.name}
              aria-label={t('renameRepo')}
              onChange={(event) => setRenaming({ ...renaming, name: event.target.value })}
            />
            <Button variant="primary" type="submit">
              {t('renameRepo')}
            </Button>
            <Button onClick={() => setRenaming(null)}>{t('cancel')}</Button>
          </div>
        </form>
      )}
      {team && (
        <section className={styles.form}>
          <div className={styles.row}>
            <strong>{t('collaboratorsOf', { repo: team.repo })}</strong>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={t('close')}
              onClick={() => setTeam(null)}
            >
              <X size={13} aria-hidden />
            </button>
          </div>
          {team.list === null ? (
            <p className={styles.muted}>{t('loading')}</p>
          ) : (
            <ul className={styles.settingList}>
              {team.list.map((person) => (
                <li key={person.login}>
                  <span>
                    {person.login} <span className={styles.muted}>{person.permission}</span>
                  </span>
                  {person.login.toLowerCase() !== account?.login.toLowerCase() && (
                    <button
                      type="button"
                      className={styles.iconButton}
                      title={t('removeCollaborator')}
                      aria-label={t('removeCollaborator')}
                      onClick={() =>
                        void api
                          .collaborators(accountKey, team.repo, 'remove', person.login)
                          .then((next) => setTeam({ repo: team.repo, list: next }))
                      }
                    >
                      <X size={13} aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form
            className={styles.row}
            onSubmit={(event) => {
              event.preventDefault()
              const login = invite.trim()
              if (!login) return
              setInvite('')
              void api
                .collaborators(accountKey, team.repo, 'add', login)
                .then((next) => {
                  setTeam({ repo: team.repo, list: next })
                  setMessage({ text: t('invited', { login }), error: false })
                })
                .catch((failure: Error) => setMessage({ text: failure.message, error: true }))
            }}
          >
            <input
              className={styles.input}
              value={invite}
              placeholder={t('inviteLogin')}
              aria-label={t('inviteLogin')}
              onChange={(event) => setInvite(event.target.value)}
            />
            <Button icon={UserPlus} type="submit">
              {t('invite')}
            </Button>
          </form>
        </section>
      )}
      <ListState error={error} loading={list === null} />
      <ul className={styles.itemList}>
        {visible.map((repo) => (
          <li key={repo.nameWithOwner}>
            <span className={styles.visibility} data-private={repo.visibility !== 'PUBLIC'}>
              {repo.visibility === 'PUBLIC' ? t('public') : t('private')}
            </span>
            <button
              type="button"
              className={styles.itemText}
              onClick={openMenuBelow(() => menu(repo))}
            >
              <strong>
                {repo.collaborator ? repo.nameWithOwner : repo.name}
                {repo.archived && <span className={styles.label}>{t('archived')}</span>}
                {repo.fork && <span className={styles.label}>fork</span>}
                {repo.localPath && <span className={styles.label}>{t('cloned')}</span>}
              </strong>
              <span className={styles.muted}>
                {repo.description || '—'} · {relative(repo.updatedAt)}
              </span>
            </button>
            {!repo.localPath && (
              <button
                type="button"
                className={styles.iconButton}
                title={t('clone')}
                aria-label={t('clone')}
                disabled={busy !== null}
                onClick={() => clone(repo)}
              >
                <Download size={14} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
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
