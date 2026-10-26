/**
 * Module Git (reprise de GitSpread dans Tessera) : projets, comptes `gh`, modifications,
 * branches, historique, dépôts GitHub, pull requests, issues et GitHub Actions.
 */

import type { GitProjectStatus } from './integrations'

export type { GitProjectStatus }

/** Compte connecté à `gh` (GitHub.com ou GitHub Enterprise). */
export interface GitAccount {
  /** `hôte/identifiant` en minuscules (clé des réglages de GitSpread). */
  key: string
  host: string
  login: string
  active: boolean
}

export interface GitProject {
  path: string
  name: string
  owner: string | null
  host: string | null
  webUrl: string | null
  /** Faux : projet ajouté à la main, pas encore suivi par git. */
  repository: boolean
  /** Compte utilisé pour les opérations réseau (`hôte/identifiant`), s'il est connu. */
  account: string | null
}

export interface GitState {
  gitInstalled: boolean
  ghInstalled: boolean
  /** Réglages de GitSpread trouvés (sinon : réglages vides, créés au premier ajout). */
  settingsFound: boolean
  accounts: GitAccount[]
  projects: GitProject[]
  roots: string[]
  missingRoots: string[]
  cloneFolder: string | null
}

/** Fichier modifié (`git status`). */
export interface GitChange {
  path: string
  /** Ancien nom (renommage). */
  from: string | null
  /** Lettre de l'index et de l'arbre de travail (`M`, `A`, `D`, `R`, `?`, `U`…). */
  index: string
  worktree: string
  staged: boolean
  untracked: boolean
  conflict: boolean
}

export interface GitBranch {
  name: string
  remote: boolean
  current: boolean
  upstream: string | null
  ahead: number
  behind: number
  /** Dernier commit (horodatage). */
  updatedAt: number
}

export interface GitCommit {
  hash: string
  short: string
  parents: string[]
  author: string
  email: string
  date: number
  /** Branches et étiquettes qui pointent sur ce commit. */
  refs: string[]
  subject: string
}

export interface GitStash {
  index: number
  message: string
}

export type GitNetworkAction = 'fetch' | 'pull' | 'push'
export type GitBranchAction = 'switch' | 'create' | 'delete' | 'merge' | 'rename'

/* ---------- GitHub ---------- */

export interface GitHubPullRequest {
  number: number
  title: string
  author: string
  head: string
  base: string
  draft: boolean
  url: string
  updatedAt: string
  review: string | null
  /** Résumé des vérifications : `success`, `failure`, `pending`, ou `null`. */
  checks: 'success' | 'failure' | 'pending' | null
}

export interface GitHubIssue {
  number: number
  title: string
  author: string
  labels: string[]
  url: string
  updatedAt: string
  state: string
}

export interface GitHubRun {
  id: number
  title: string
  workflow: string
  branch: string
  event: string
  status: string
  conclusion: string | null
  url: string
  createdAt: string
}

export interface GitHubRepository {
  nameWithOwner: string
  name: string
  description: string
  visibility: 'PUBLIC' | 'PRIVATE' | 'INTERNAL'
  archived: boolean
  fork: boolean
  url: string
  updatedAt: string
  /** Dépôt d'un autre compte où l'utilisateur est collaborateur. */
  collaborator: boolean
  /** Déjà cloné sur ce PC (chemin du projet). */
  localPath: string | null
}

export interface GitHubCollaborator {
  login: string
  permission: string
}

export type GitHubRepositoryAction =
  'visibility' | 'archive' | 'unarchive' | 'rename' | 'delete' | 'transfer'
