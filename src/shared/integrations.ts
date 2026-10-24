/**
 * Intégrations avec des applications de l'utilisateur (permission `integrations`).
 *
 * Chaque intégration est un connecteur écrit dans le processus principal, propre à une
 * application connue : il lit ses fichiers de données à des emplacements fixes, appelle son API
 * locale (127.0.0.1 uniquement, actions en liste blanche) et ne transmet jamais ses secrets à
 * l'interface. Une extension déclare celles qu'elle utilise :
 * `"permissions": ["integrations"], "integrations": ["devlauncher"]`.
 */

export const INTEGRATION_IDS = ['devlauncher', 'gitspread', 'prospect'] as const
export type IntegrationId = (typeof INTEGRATION_IDS)[number]

/** Nom affiché de chaque application (nom propre, identique dans toutes les langues). */
export const INTEGRATION_NAMES: Record<IntegrationId, string> = {
  devlauncher: 'DevLauncher',
  gitspread: 'GitSpread',
  prospect: 'Prospect Solution'
}

export const isIntegrationId = (value: unknown): value is IntegrationId =>
  INTEGRATION_IDS.includes(value as IntegrationId)

/** Canaux IPC des intégrations (renderer -> main), regroupés ici plutôt que dans `ipc.ts`. */
export const IntegrationChannels = {
  devlauncherState: 'integrations:devlauncher-state',
  devlauncherServices: 'integrations:devlauncher-services',
  devlauncherServiceLogs: 'integrations:devlauncher-service-logs',
  devlauncherLaunch: 'integrations:devlauncher-launch',
  devlauncherStopAll: 'integrations:devlauncher-stop-all',
  devlauncherRestart: 'integrations:devlauncher-restart',
  devlauncherLaunchLog: 'integrations:devlauncher-launch-log',
  devlauncherPickExecutable: 'integrations:devlauncher-pick-executable',
  devlauncherOpen: 'integrations:devlauncher-open',
  gitspreadState: 'integrations:gitspread-state',
  gitspreadStatus: 'integrations:gitspread-status',
  gitspreadOpenFolder: 'integrations:gitspread-open-folder',
  gitspreadOpenWeb: 'integrations:gitspread-open-web',
  gitspreadPickExecutable: 'integrations:gitspread-pick-executable',
  gitspreadOpen: 'integrations:gitspread-open',
  prospectHealth: 'integrations:prospect-health',
  prospectStatistics: 'integrations:prospect-statistics',
  prospectFollowUps: 'integrations:prospect-follow-ups',
  prospectJobs: 'integrations:prospect-jobs',
  prospectCancelJob: 'integrations:prospect-cancel-job',
  prospectCall: 'integrations:prospect-call'
} as const

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

/**
 * Codes d'erreur lisibles par l'interface :
 * - `permission` : l'extension n'a pas déclaré cette intégration ;
 * - `unavailable` : l'application (ou son API) ne répond pas ;
 * - `not-found` : fichier, dossier ou programme introuvable ;
 * - `invalid` : demande refusée (valeur hors des listes autorisées) ;
 * - `failed` : l'application a répondu par une erreur (message dans le texte).
 */
export type IntegrationErrorCode = 'permission' | 'unavailable' | 'not-found' | 'invalid' | 'failed'

const ERROR_CODES: IntegrationErrorCode[] = [
  'permission',
  'unavailable',
  'not-found',
  'invalid',
  'failed'
]

/** Code d'une erreur renvoyée par une intégration (`failed` par défaut). */
export function getIntegrationErrorCode(error: unknown): IntegrationErrorCode {
  const match = /\[([a-z-]+)\]/.exec(error instanceof Error ? error.message : String(error))
  return ERROR_CODES.find((code) => code === match?.[1]) ?? 'failed'
}

/** Message d'une erreur `failed` (texte renvoyé par l'application), sans le préfixe IPC. */
export function getIntegrationErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  return text.replace(/^.*?\[[a-z-]+\]\s*/s, '')
}

// ---------------------------------------------------------------------------
// DevLauncher
// ---------------------------------------------------------------------------

/**
 * État du serveur MCP de DevLauncher :
 * - `disabled` : désactivé dans ses paramètres ;
 * - `offline` : rien n'écoute sur son port (DevLauncher fermé) ;
 * - `other-service` : un autre programme occupe son port ;
 * - `unauthorized` : le jeton enregistré est refusé ;
 * - `connected` : prêt.
 */
export type McpStatus = 'disabled' | 'offline' | 'other-service' | 'unauthorized' | 'connected'

export interface DevLauncherProject {
  name: string
  path: string
  /** Technologie détectée (Symfony, Laravel, Node.js…), `null` si inconnue. */
  type: string | null
  profiles: string[]
  /** Dernier profil utilisé pour ce projet. */
  lastProfile: string | null
  favorite: boolean
  /** Rang dans les projets récemment lancés (0 = le plus récent), `null` sinon. */
  recent: number | null
  launchCount: number
  lastLaunchAt: number | null
}

export interface DevLauncherState {
  /** Dossier de données `%APPDATA%\DevLauncher` trouvé. */
  installed: boolean
  /** DevLauncher est ouvert (processus `DevLauncher.exe`). */
  running: boolean
  /** Exécutable choisi par l'utilisateur, ou à défaut celui trouvé à l'emplacement habituel. */
  executable: string | null
  mcp: { status: McpStatus; port: number | null }
  projects: DevLauncherProject[]
}

/** Service lancé par DevLauncher, ou composant XAMPP (Apache, MySQL, FileZilla). */
export interface DevLauncherService {
  name: string
  project: string | null
  running: boolean
  /** Prêt à répondre ; `null` quand DevLauncher ne le sait pas. */
  ready: boolean | null
}

// ---------------------------------------------------------------------------
// GitSpread
// ---------------------------------------------------------------------------

export interface GitSpreadProject {
  path: string
  name: string
  /** Propriétaire du dépôt distant principal (compte GitHub), `null` sans remote reconnu. */
  owner: string | null
  /** Hôte du dépôt distant (ex. `github.com`). */
  host: string | null
  /** Page web du dépôt (https), `null` si inconnue. */
  webUrl: string | null
  /** Faux pour un projet ajouté à la main qui n'est pas suivi par git. */
  repository: boolean
}

export interface GitSpreadState {
  /** Fichier de paramètres de GitSpread trouvé. */
  installed: boolean
  running: boolean
  executable: string | null
  projects: GitSpreadProject[]
  /** Dossiers configurés dans GitSpread qui n'existent plus. */
  missingRoots: string[]
}

/** État git d'un projet, lu sans réseau (`git status`). */
export interface GitProjectStatus {
  path: string
  /** Message d'erreur de git (dossier refusé, dépôt abîmé…), `null` si tout va bien. */
  error: string | null
  branch: string | null
  detached: boolean
  upstream: string | null
  ahead: number
  behind: number
  staged: number
  modified: number
  untracked: number
  conflicts: number
  /** Date de la dernière récupération (`FETCH_HEAD`), `null` si jamais. */
  lastFetchAt: number | null
}

// ---------------------------------------------------------------------------
// Prospect Solution
// ---------------------------------------------------------------------------

/** Versions de l'API de Prospect Solution que le connecteur connaît. */
export const PROSPECT_API_VERSIONS = [9]
export const PROSPECT_DEFAULT_PORT = 8765

/**
 * - `offline` : rien n'écoute sur le port ;
 * - `other-service` : un autre programme répond sur ce port ;
 * - `ready` : Prospect Solution répond (`apiVersion` à comparer à `PROSPECT_API_VERSIONS`).
 */
export interface ProspectHealth {
  status: 'offline' | 'other-service' | 'ready'
  apiVersion: number | null
}

export interface ProspectStatistics {
  total: number
  withoutPhone: number
  followUpsDue: number
  byStatus: Record<string, number>
  byOpportunity: Record<string, number>
}

export interface ProspectFollowUp {
  id: number
  name: string
  city: string | null
  phone: string | null
  status: string
  /** Date de relance (AAAA-MM-JJ). */
  nextFollowUp: string | null
  category: string | null
}

export interface ProspectJob {
  id: number
  kind: string
  label: string
  /** `running`, `completed`, `failed` ou `cancelled`. */
  status: string
  progressCurrent: number
  progressTotal: number | null
  message: string | null
  error: string | null
  createdAt: string | null
  finishedAt: string | null
}
