import { ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import { BuiltinChannels as C } from '@shared/builtin-ipc'
import type {
  FileEntry,
  FileFavorite,
  FileOperationResult,
  FilePlace,
  FolderListing,
  OpenResult
} from '@shared/files'
import type { Game, GameStatus } from '@shared/games'
import type {
  GitBranch,
  GitBranchAction,
  GitChange,
  GitCommit,
  GitHubCollaborator,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepository,
  GitHubRepositoryAction,
  GitHubRun,
  GitNetworkAction,
  GitProjectStatus,
  GitStash,
  GitState
} from '@shared/git'
import type { LocalServicesState, MonitoredSite, SiteStatus } from '@shared/devtools'
import type { NewsState } from '@shared/news'
import type {
  SpotifyCommand,
  SpotifyItem,
  SpotifyKind,
  SpotifyPlayback,
  SpotifyState,
  MediaTimeline
} from '@shared/spotify'
import type { TaskInput, TasksState } from '@shared/tasks'
import type { TerminalShell } from '@shared/terminal'

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

/** Modules intégrés de l'étape 19, exposés sous `window.tessera.<module>`. */
export const builtinsApi = {
  files: {
    list: (path: string): Promise<FolderListing> => ipcRenderer.invoke(C.filesList, path),
    places: (): Promise<FilePlace[]> => ipcRenderer.invoke(C.filesPlaces),
    search: (path: string, query: string): Promise<FileEntry[]> =>
      ipcRenderer.invoke(C.filesSearch, path, query),
    copy: (sources: string[], target: string): Promise<FileOperationResult> =>
      ipcRenderer.invoke(C.filesCopy, sources, target),
    move: (sources: string[], target: string): Promise<FileOperationResult> =>
      ipcRenderer.invoke(C.filesMove, sources, target),
    rename: (path: string, name: string): Promise<string> =>
      ipcRenderer.invoke(C.filesRename, path, name),
    createFolder: (parent: string, name: string): Promise<string> =>
      ipcRenderer.invoke(C.filesCreateFolder, parent, name),
    trash: (paths: string[]): Promise<FileOperationResult> =>
      ipcRenderer.invoke(C.filesTrash, paths),
    /** Ouvre un fichier (dans le bloc de son application si elle y est affichée). */
    open: (path: string): Promise<OpenResult> => ipcRenderer.invoke(C.filesOpen, path),
    show: (path: string): Promise<void> => ipcRenderer.invoke(C.filesShow, path),
    icons: (paths: string[]): Promise<Record<string, string | null>> =>
      ipcRenderer.invoke(C.filesIcons, paths),
    thumbnail: (path: string): Promise<string | null> => ipcRenderer.invoke(C.filesThumbnail, path),
    /** À appeler au début du glissement (`dragstart`). */
    drag: (paths: string[]): void => ipcRenderer.send(C.filesDrag, paths),
    /** Chemins des fichiers déposés (depuis l'Explorateur ou un autre bloc). */
    pathsOf: (files: File[]): string[] =>
      files.map((file) => webUtils.getPathForFile(file)).filter(Boolean),
    pickFolder: (): Promise<string | null> => ipcRenderer.invoke(C.filesPickFolder),
    favorites: (): Promise<FileFavorite[]> => ipcRenderer.invoke(C.filesFavorites),
    setFavorite: (path: string, on: boolean): Promise<void> =>
      ipcRenderer.invoke(C.filesSetFavorite, path, on),
    reorderFavorites: (paths: string[]): Promise<void> =>
      ipcRenderer.invoke(C.filesReorderFavorites, paths),
    onFavoritesChange: (callback: (favorites: FileFavorite[]) => void) =>
      subscribe(C.filesFavoritesChanged, callback)
  },
  games: {
    list: (force = false): Promise<Game[]> => ipcRenderer.invoke(C.gamesList, force),
    /** Lance le jeu par son lanceur (hors de Tessera). */
    launch: (id: string): Promise<void> => ipcRenderer.invoke(C.gamesLaunch, id),
    /** Jeux en cours et leur volume. */
    status: (): Promise<GameStatus[]> => ipcRenderer.invoke(C.gamesStatus),
    setVolume: (id: string, change: { volume?: number; muted?: boolean }): Promise<void> =>
      ipcRenderer.invoke(C.gamesSetVolume, id, change),
    /** Insère la fenêtre du jeu en cours dans Tessera : identifiant de l'application, ou `null`. */
    capture: (id: string): Promise<string | null> => ipcRenderer.invoke(C.gamesCapture, id)
  },
  /** Module Git (reprise de GitSpread) : projets, modifications, branches, GitHub. */
  git: {
    state: (force = false): Promise<GitState> => ipcRenderer.invoke(C.gitState, force),
    statuses: (paths: string[]): Promise<GitProjectStatus[]> =>
      ipcRenderer.invoke(C.gitStatuses, paths),
    changes: (path: string): Promise<GitChange[]> => ipcRenderer.invoke(C.gitChanges, path),
    diff: (path: string, file: string, staged: boolean): Promise<string> =>
      ipcRenderer.invoke(C.gitDiff, path, file, staged),
    stage: (path: string, files: string[], on: boolean): Promise<void> =>
      ipcRenderer.invoke(C.gitStage, path, files, on),
    discard: (path: string, files: string[]): Promise<void> =>
      ipcRenderer.invoke(C.gitDiscard, path, files),
    commit: (path: string, message: string, files: string[]): Promise<void> =>
      ipcRenderer.invoke(C.gitCommit, path, message, files),
    network: (path: string, action: GitNetworkAction): Promise<string> =>
      ipcRenderer.invoke(C.gitNetwork, path, action),
    branches: (path: string): Promise<GitBranch[]> => ipcRenderer.invoke(C.gitBranches, path),
    branchAction: (
      path: string,
      action: GitBranchAction,
      name: string,
      extra?: string | boolean
    ): Promise<void> => ipcRenderer.invoke(C.gitBranchAction, path, action, name, extra),
    log: (path: string, all: boolean, limit = 300): Promise<GitCommit[]> =>
      ipcRenderer.invoke(C.gitLog, path, all, limit),
    stash: (
      path: string,
      action: 'list' | 'push' | 'pop' | 'drop',
      index = 0
    ): Promise<GitStash[]> => ipcRenderer.invoke(C.gitStash, path, action, index),
    openFolder: (path: string): Promise<void> => ipcRenderer.invoke(C.gitOpenFolder, path),
    openUrl: (url: string): Promise<void> => ipcRenderer.invoke(C.gitOpenUrl, url),
    pullRequests: (path: string): Promise<GitHubPullRequest[]> =>
      ipcRenderer.invoke(C.gitPullRequests, path),
    pullRequestAction: (
      path: string,
      number: number,
      action: 'checkout' | 'merge' | 'squash' | 'close' | 'ready'
    ): Promise<void> => ipcRenderer.invoke(C.gitPullRequestAction, path, number, action),
    createPullRequest: (
      path: string,
      input: { title: string; body: string; base: string; draft: boolean }
    ): Promise<string> => ipcRenderer.invoke(C.gitCreatePullRequest, path, input),
    issues: (path: string, state: 'open' | 'closed'): Promise<GitHubIssue[]> =>
      ipcRenderer.invoke(C.gitIssues, path, state),
    issueAction: (
      path: string,
      action: 'create' | 'close' | 'reopen',
      input: { number?: number; title?: string; body?: string }
    ): Promise<void> => ipcRenderer.invoke(C.gitIssueAction, path, action, input),
    runs: (path: string): Promise<GitHubRun[]> => ipcRenderer.invoke(C.gitRuns, path),
    runAction: (path: string, id: number, action: 'rerun' | 'cancel'): Promise<void> =>
      ipcRenderer.invoke(C.gitRunAction, path, id, action),
    publish: (path: string, account: string, name: string, privateRepo: boolean): Promise<void> =>
      ipcRenderer.invoke(C.gitPublish, path, account, name, privateRepo),
    repositories: (account: string): Promise<GitHubRepository[]> =>
      ipcRenderer.invoke(C.gitRepositories, account),
    clone: (account: string, repo: string, folder: string): Promise<string> =>
      ipcRenderer.invoke(C.gitClone, account, repo, folder),
    repositoryAction: (
      account: string,
      repo: string,
      action: GitHubRepositoryAction,
      value?: string
    ): Promise<void> => ipcRenderer.invoke(C.gitRepositoryAction, account, repo, action, value),
    collaborators: (
      account: string,
      repo: string,
      action: 'list' | 'add' | 'remove',
      login?: string
    ): Promise<GitHubCollaborator[]> =>
      ipcRenderer.invoke(C.gitCollaborators, account, repo, action, login),
    settings: (
      action:
        'addRoot' | 'removeRoot' | 'addProject' | 'hideProject' | 'setAccount' | 'cloneFolder',
      path: string,
      value?: string | null
    ): Promise<void> => ipcRenderer.invoke(C.gitSettings, action, path, value)
  },
  /** Module Terminal : sessions de console (PowerShell, cmd, Git Bash, WSL). */
  terminal: {
    shells: (): Promise<TerminalShell[]> => ipcRenderer.invoke(C.terminalShells),
    create: (shell: string, cwd: string, cols: number, rows: number): Promise<string> =>
      ipcRenderer.invoke(C.terminalCreate, shell, cwd, cols, rows),
    attach: (id: string): Promise<{ buffer: string; exited: boolean } | null> =>
      ipcRenderer.invoke(C.terminalAttach, id),
    write: (id: string, data: string): void => ipcRenderer.send(C.terminalWrite, id, data),
    resize: (id: string, cols: number, rows: number): void =>
      ipcRenderer.send(C.terminalResize, id, cols, rows),
    close: (id: string): Promise<void> => ipcRenderer.invoke(C.terminalClose, id),
    onData: (callback: (id: string, data: string) => void) => {
      const listener = (_event: IpcRendererEvent, id: string, data: string): void =>
        callback(id, data)
      ipcRenderer.on(C.terminalData, listener)
      return () => ipcRenderer.removeListener(C.terminalData, listener)
    },
    onExit: (callback: (id: string, code: number) => void) => {
      const listener = (_event: IpcRendererEvent, id: string, code: number): void =>
        callback(id, code)
      ipcRenderer.on(C.terminalExit, listener)
      return () => ipcRenderer.removeListener(C.terminalExit, listener)
    }
  },
  /** Module Tâches : listes locales et Google Tasks. */
  tasks: {
    state: (): Promise<TasksState> => ipcRenderer.invoke(C.tasksState),
    /** Crée ou modifie une tâche ; `previousListId` si elle change de liste. */
    save: (input: TaskInput, previousListId?: string): Promise<TasksState> =>
      ipcRenderer.invoke(C.tasksSave, input, previousListId),
    remove: (id: string, listId: string): Promise<TasksState> =>
      ipcRenderer.invoke(C.tasksDelete, id, listId),
    createList: (name: string, account: string | null): Promise<TasksState> =>
      ipcRenderer.invoke(C.tasksCreateList, name, account),
    onChange: (callback: (state: TasksState) => void) => subscribe(C.tasksChanged, callback),
    deleteList: (listId: string): Promise<TasksState> =>
      ipcRenderer.invoke(C.tasksDeleteList, listId),
    disconnect: (accountId: string): Promise<void> =>
      ipcRenderer.invoke(C.tasksDisconnect, accountId)
  },
  /** Module Actualités : flux RSS / Atom. */
  news: {
    state: (): Promise<NewsState> => ipcRenderer.invoke(C.newsState),
    refresh: (): Promise<NewsState> => ipcRenderer.invoke(C.newsRefresh),
    addFeed: (url: string): Promise<NewsState> => ipcRenderer.invoke(C.newsAddFeed, url),
    updateFeed: (id: string, change: { notify?: boolean; title?: string }): Promise<NewsState> =>
      ipcRenderer.invoke(C.newsUpdateFeed, id, change),
    removeFeed: (id: string): Promise<NewsState> => ipcRenderer.invoke(C.newsRemoveFeed, id),
    onChange: (callback: (state: NewsState) => void) => subscribe(C.newsChanged, callback),
    markRead: (ids: string[], read: boolean): Promise<NewsState> =>
      ipcRenderer.invoke(C.newsMarkRead, ids, read)
  },
  /** Module Services locaux : ports en écoute, programmes, Docker. */
  services: {
    state: (): Promise<LocalServicesState> => ipcRenderer.invoke(C.servicesState),
    stop: (pid: number): Promise<void> => ipcRenderer.invoke(C.servicesStop, pid),
    docker: (id: string, action: 'start' | 'stop' | 'restart'): Promise<void> =>
      ipcRenderer.invoke(C.servicesDocker, id, action),
    showFolder: (path: string): Promise<void> => ipcRenderer.invoke(C.servicesShowFolder, path)
  },
  /** Module Surveillance de sites. */
  monitor: {
    state: (): Promise<SiteStatus[]> => ipcRenderer.invoke(C.monitorState),
    save: (site: Partial<MonitoredSite>): Promise<SiteStatus[]> =>
      ipcRenderer.invoke(C.monitorSave, site),
    remove: (id: string): Promise<SiteStatus[]> => ipcRenderer.invoke(C.monitorRemove, id),
    check: (id: string): Promise<SiteStatus[]> => ipcRenderer.invoke(C.monitorCheck, id)
  },
  /** Module Spotify : bibliothèque et recherche ; la lecture s'ouvre dans l'application. */
  spotify: {
    state: (): Promise<SpotifyState> => ipcRenderer.invoke(C.spotifyState),
    setClientId: (id: string): Promise<SpotifyState> =>
      ipcRenderer.invoke(C.spotifySetClientId, id),
    connect: (): Promise<SpotifyState> => ipcRenderer.invoke(C.spotifyConnect),
    disconnect: (): Promise<SpotifyState> => ipcRenderer.invoke(C.spotifyDisconnect),
    data: (kind: SpotifyKind, value?: string): Promise<SpotifyItem[]> =>
      ipcRenderer.invoke(C.spotifyData, kind, value),
    open: (uri: string): Promise<void> => ipcRenderer.invoke(C.spotifyOpen, uri),
    /** Lecture en cours sur le compte, ou `null`. */
    playback: (): Promise<SpotifyPlayback | null> => ipcRenderer.invoke(C.spotifyPlayback),
    control: (action: SpotifyCommand): Promise<void> =>
      ipcRenderer.invoke(C.spotifyControl, action),
    /** Volume de l'application Spotify de ce PC (`null` : pas de session audio). */
    volume: (): Promise<{ volume: number; muted: boolean } | null> =>
      ipcRenderer.invoke(C.spotifyVolume),
    setVolume: (change: { volume?: number; muted?: boolean }): Promise<void> =>
      ipcRenderer.invoke(C.spotifySetVolume, change),
    /**
     * Application installée de Tessera qui affiche Spotify (ajoutée au besoin), ou `null` si
     * Spotify n'est pas installé sur ce PC.
     */
    app: (): Promise<string | null> => ipcRenderer.invoke(C.spotifyApp),
    /** Position et durée du titre en cours dans l'application Spotify de ce PC, ou `null`. */
    timeline: (): Promise<MediaTimeline | null> => ipcRenderer.invoke(C.spotifyTimeline),
    /** Déplace la lecture (ms). */
    seek: (position: number): Promise<void> => ipcRenderer.invoke(C.spotifySeek, position)
  }
}
