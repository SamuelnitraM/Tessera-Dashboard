/**
 * SDK des extensions Tessera Dashboard — importé par les extensions via `@tessera/plugin-sdk`.
 *
 * C'est le seul module qu'une extension doit importer depuis l'app : tout ce qui n'est pas
 * exporté ici est interne et peut changer sans prévenir.
 */
import {
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentType,
  type RefObject
} from 'react'
import { useTranslation } from 'react-i18next'
import type { NotifyInput } from '@shared/notifications'
import type { PluginFileEntry } from '@shared/plugin-files'
import type { LaunchOptions, PickedTarget, ProcessRun } from '@shared/plugin-processes'
import type { Language } from '@shared/settings'
import { PluginContext } from './context'

export { PLUGIN_API_VERSION } from '@shared/plugins'
export type { Language }

/** Ce que reçoit le composant d'un widget. */
export interface WidgetProps<Config extends object = Record<string, unknown>> {
  /** Identifiant unique de ce widget sur sa page. */
  instanceId: string
  /**
   * Configuration du widget : les réglages déclarés dans le manifeste (valeurs par défaut
   * comprises), plus toute donnée enregistrée par le widget avec `setConfig`.
   */
  config: Config
  /** Modifie la configuration (fusionnée avec l'existante, puis sauvegardée). */
  setConfig: (patch: Partial<Config>) => void
  /** La page est en mode édition : le widget peut proposer une édition directe. */
  editing: boolean
}

/** Composant de widget, quelle que soit la forme de sa configuration. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WidgetComponent = ComponentType<WidgetProps<any>>

/** Textes propres à une extension : `{ fr: { cle: 'texte' }, en: { … } }`. */
export type PluginTranslations = Partial<Record<Language, Record<string, unknown>>>

/** Code d'une extension, exporté par défaut par son fichier `index.tsx`. */
export interface PluginModule {
  /** Un composant par widget déclaré dans le manifeste, indexé par son `type`. */
  widgets: Record<string, WidgetComponent>
  translations?: PluginTranslations
}

/** Déclare le code d'une extension (n'ajoute rien, mais vérifie sa forme à la compilation). */
export function definePlugin(plugin: PluginModule): PluginModule {
  return plugin
}

/**
 * Référence toujours à jour vers une valeur, lisible depuis des fonctions asynchrones,
 * des écouteurs ou un nettoyage d'effet, sans les recréer à chaque rendu.
 * (Mise à jour juste après le rendu, comme le recommande React.)
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

/** Langue actuelle de l'interface, pour formater dates et nombres (`Intl`). */
export function useLanguage(): Language {
  const { i18n } = useTranslation()
  return i18n.language === 'en' ? 'en' : 'fr'
}

// ---------------------------------------------------------------------------
// Fichiers (permission `files`)
// ---------------------------------------------------------------------------

export type { PluginFileEntry, PluginFileErrorCode } from '@shared/plugin-files'
export { getPluginFileErrorCode, isValidFileName } from '@shared/plugin-files'

/**
 * Fichiers de l'extension, dans son dossier `Documents\Tessera Dashboard\<files.folder>`.
 * Nécessite `"permissions": ["files"]` et `"files": { "folder": "…" }` dans le manifeste.
 * Les erreurs portent un code lisible avec `getPluginFileErrorCode(error)`.
 */
export interface PluginFiles {
  list: () => Promise<PluginFileEntry[]>
  read: (name: string) => Promise<string>
  /** Crée ou remplace un fichier texte (UTF-8). */
  write: (name: string, content: string) => Promise<PluginFileEntry>
  /** Renomme un fichier (refusé si le nouveau nom existe déjà). */
  rename: (from: string, to: string) => Promise<PluginFileEntry>
  /** Envoie le fichier à la Corbeille de Windows. */
  trash: (name: string) => Promise<void>
  /** Ouvre le dossier dans l'Explorateur Windows. */
  openFolder: () => Promise<void>
  /**
   * Importe des fichiers choisis par l'utilisateur (ex. `['md', 'txt']`) : ils sont copiés
   * dans le dossier de l'extension. Renvoie les fichiers importés ([] si annulé).
   */
  importFiles: (extensions: string[]) => Promise<PluginFileEntry[]>
  /** Chemin complet du dossier (pour l'afficher). */
  getFolder: () => Promise<string>
  /** Prévient quand le contenu du dossier change (même depuis un autre programme). */
  onChange: (callback: () => void) => () => void
}

export function usePluginFiles(): PluginFiles {
  const pluginId = useContext(PluginContext)?.id
  return useMemo(() => {
    if (!pluginId) throw new Error('usePluginFiles doit être utilisé dans un widget.')
    const api = window.tessera.pluginFiles
    return {
      list: () => api.list(pluginId),
      read: (name) => api.read(pluginId, name),
      write: (name, content) => api.write(pluginId, name, content),
      rename: (from, to) => api.rename(pluginId, from, to),
      trash: (name) => api.trash(pluginId, name),
      openFolder: () => api.openFolder(pluginId),
      importFiles: (extensions) => api.importFiles(pluginId, extensions),
      getFolder: () => api.getFolder(pluginId),
      onChange: (callback) => api.onChange((changed) => changed === pluginId && callback())
    }
  }, [pluginId])
}

// ---------------------------------------------------------------------------
// Programmes (permission `processes`)
// ---------------------------------------------------------------------------

export type {
  ConsoleMode,
  LaunchableKind,
  LaunchOptions,
  PickedTarget,
  ProcessErrorCode,
  ProcessRun
} from '@shared/plugin-processes'
export {
  defaultConsoleMode,
  getLaunchableKind,
  getProcessErrorCode,
  targetName
} from '@shared/plugin-processes'

/**
 * Lancement de programmes. Nécessite `"permissions": ["processes"]` dans le manifeste.
 * Seuls les programmes choisis par l'utilisateur avec `pick()` peuvent être lancés.
 */
export interface PluginProcesses {
  /** Ouvre la fenêtre de sélection de Windows ; `null` si l'utilisateur annule. */
  pick: () => Promise<PickedTarget | null>
  /** Lance le programme. `owner` identifie le widget (en général son `instanceId`). */
  start: (owner: string, options: LaunchOptions) => Promise<ProcessRun>
  /** Demande la fermeture, puis force l'arrêt (programme et sous-programmes). */
  stop: (runId: string) => Promise<void>
  /** Exécutions en cours ou récentes de l'extension. */
  list: () => Promise<ProcessRun[]>
  getOutput: (runId: string) => Promise<string>
  clearOutput: (runId: string) => Promise<void>
  /** Icône du programme (image `data:`), ou `null`. */
  getIcon: (path: string) => Promise<string | null>
  showInFolder: (path: string) => Promise<void>
  /** Le programme tourne-t-il, même lancé en dehors de Tessera ? (exécutables uniquement) */
  isRunning: (path: string) => Promise<boolean>
  onChange: (callback: (run: ProcessRun) => void) => () => void
  onOutput: (callback: (runId: string, text: string) => void) => () => void
}

export function useProcesses(): PluginProcesses {
  const pluginId = useContext(PluginContext)?.id
  return useMemo(() => {
    if (!pluginId) throw new Error('useProcesses doit être utilisé dans un widget.')
    const api = window.tessera.processes
    return {
      pick: () => api.pick(pluginId),
      start: (owner, options) => api.start(pluginId, owner, options),
      stop: (runId) => api.stop(pluginId, runId),
      list: () => api.list(pluginId),
      getOutput: (runId) => api.getOutput(pluginId, runId),
      clearOutput: (runId) => api.clearOutput(pluginId, runId),
      getIcon: (path) => api.getIcon(pluginId, path),
      showInFolder: (path) => api.showInFolder(pluginId, path),
      isRunning: (path) => api.isRunning(pluginId, path),
      onChange: (callback) => api.onChange((id, run) => id === pluginId && callback(run)),
      onOutput: (callback) =>
        api.onOutput((id, runId, text) => id === pluginId && callback(runId, text))
    }
  }, [pluginId])
}

// ---------------------------------------------------------------------------
// Notifications (permission `notifications`)
// ---------------------------------------------------------------------------

export type { NotifyInput } from '@shared/notifications'

export interface PluginNotifications {
  /**
   * Envoie une notification : centre de notifications, bannière Windows et son, selon les
   * réglages de l'utilisateur (Paramètres → Notifications) et le mode Ne pas déranger.
   */
  notify: (input: NotifyInput) => Promise<void>
}

export function useNotifications(): PluginNotifications {
  const pluginId = useContext(PluginContext)?.id
  return useMemo(
    () => ({
      notify: async (input) => {
        if (!pluginId) throw new Error('useNotifications doit être utilisé dans un widget.')
        await window.tessera.notifications.notify(pluginId, input)
      }
    }),
    [pluginId]
  )
}

// ---------------------------------------------------------------------------
// Pages web (permission `web`)
// ---------------------------------------------------------------------------

export type { WebFrameHandle as WebViewHandle } from '../components/web/WebFrame'
export { useWebApps, type UserWebApp } from './apps'
export { WebView, type WebViewProps } from './web'
export { normalizeWebUrl } from '@shared/web-apps'

// ---------------------------------------------------------------------------
// Applications installées (permission `apps`)
// ---------------------------------------------------------------------------

export {
  installedAppForBrowser,
  openWebPage,
  refreshInstalledApp,
  revealInstalledApp,
  takeOutInstalledApp,
  useBrowserChoices,
  useInstalledApps,
  type BrowserChoice,
  type UserInstalledApp
} from './apps'
export { InstalledAppView, type InstalledAppViewProps, type PanOffset } from './installed'
/** Fenêtre d'ajout d'une application installée : renvoie l'application ajoutée, ou `null`. */
export { pickInstalledApp as addInstalledApp } from '../stores/programPicker'

// ---------------------------------------------------------------------------
// Mails (permission `mail`)
// ---------------------------------------------------------------------------

export type {
  MailAccount,
  MailAccountState,
  MailAction,
  MailAddress,
  MailAttachment,
  MailDraft,
  MailErrorCode,
  MailFilter,
  MailFolder,
  MailFolderKind,
  MailMessage,
  MailPage,
  MailQuery,
  MailSummary,
  MailUpload
} from '@shared/mail'
export {
  DEFAULT_QUERY,
  FOLDER_ORDER,
  formatAddress,
  getMailErrorCode,
  INBOX,
  parseAddressList
} from '@shared/mail'
export {
  openMailSettings,
  useMail,
  useMailAccounts,
  useMailArrivals,
  useMailOpenRequest,
  type PluginMail
} from './mail'
export { mailErrorMessage } from '../stores/mail'

// ---------------------------------------------------------------------------
// Lecteurs vidéo (permission `web`) et comptes YouTube / Twitch (permission `media`)
// ---------------------------------------------------------------------------

export type {
  MediaStatus,
  MediaTarget,
  QueueItem,
  TwitchChannel,
  TwitchStream,
  YouTubeAccount,
  YouTubePlaylist,
  YouTubeSearch,
  YouTubeVideo
} from '@shared/media'
export { MEDIA_REFERRER, parseMediaLink, playerUrl, twitchChatUrl } from '@shared/media'
export { MediaView, type MediaViewProps } from './MediaView'
export {
  closeMediaView,
  openMediaSettings,
  useMedia,
  useMediaPlaying,
  useMediaQueue,
  useMediaReveal,
  useMediaStatus,
  useNotificationTarget,
  useTwitchLive,
  useYouTubeAccounts,
  type PluginMedia
} from './media'
export {
  getMediaPosition,
  pauseMedia,
  useLocalMedia,
  useMediaError,
  type PluginLocalMedia
} from './localMedia'
export {
  isLocalMediaUrl,
  localMediaUrl,
  type ExternalPlayer,
  type LocalMediaFile
} from '@shared/local-media'

// ---------------------------------------------------------------------------
// Intégrations DevLauncher, GitSpread, Prospect Solution (permission `integrations`)
// ---------------------------------------------------------------------------

export type {
  DevLauncherProject,
  DevLauncherService,
  DevLauncherState,
  GitProjectStatus,
  GitSpreadProject,
  GitSpreadState,
  IntegrationErrorCode,
  IntegrationId,
  McpStatus,
  ProspectFollowUp,
  ProspectHealth,
  ProspectJob,
  ProspectStatistics
} from '@shared/integrations'
export {
  getIntegrationErrorCode,
  getIntegrationErrorMessage,
  PROSPECT_API_VERSIONS,
  PROSPECT_DEFAULT_PORT
} from '@shared/integrations'
export {
  useDevLauncher,
  useGitSpread,
  useProspect,
  type PluginDevLauncher,
  type PluginGitSpread,
  type PluginProspect
} from './integrations'

// ---------------------------------------------------------------------------
// Composants d'interface de l'app, pour un rendu cohérent avec le reste de Tessera
// ---------------------------------------------------------------------------

export { Button } from '../components/ui/Button'
/** Menu du clic droit de Tessera : `onContextMenu={openContextMenu([...])}`. */
export {
  openContextMenu,
  openMenuBelow,
  type MenuItem,
  type MenuAction
} from '../stores/contextMenu'
export { ConfirmDialog, type ConfirmAction } from '../components/ui/ConfirmDialog'
export { Dialog } from '../components/ui/Dialog'
export { SegmentedControl } from '../components/ui/SegmentedControl'
export { Select } from '../components/ui/Select'
export { Switch } from '../components/ui/Switch'

// ---------------------------------------------------------------------------
// Traductions
// ---------------------------------------------------------------------------

type TranslateFunction = (key: string, values?: Record<string, unknown>) => string

/**
 * Traduit les textes de l'extension (déclarés dans `translations`).
 * Exemple : `const t = usePluginTranslation(); t('placeholder')`.
 */
export function usePluginTranslation(): TranslateFunction {
  const pluginId = useContext(PluginContext)?.id
  const { i18n } = useTranslation()
  const language = i18n.language

  return useMemo(() => {
    // Chaque extension a son propre espace de noms i18next : son identifiant
    const getFixedT = i18n.getFixedT.bind(i18n) as unknown as (
      language: string,
      namespace: string | undefined
    ) => TranslateFunction
    return getFixedT(language, pluginId ?? undefined)
  }, [i18n, language, pluginId])
}
