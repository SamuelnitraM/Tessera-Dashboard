/**
 * SDK des modules Tessera Dashboard (`@tessera/module-sdk`).
 *
 * Un module s'exécute dans un cadre isolé : ce SDK le relie à Tessera (état du bloc, thème,
 * langue) et donne accès, selon les permissions accordées par l'utilisateur, aux mêmes API que
 * les extensions intégrées. Les noms sont identiques à ceux du SDK intégré, pour qu'un widget
 * passe de l'un à l'autre presque sans changement ; les différences sont documentées.
 */

export { PLUGIN_API_VERSION } from '../../../src/shared/plugins'
export type { LocalizedText, PluginManifest, PluginPermission } from '../../../src/shared/plugins'
export type { Language } from '../../../src/shared/settings'

// Code du module, état du bloc
export {
  definePlugin,
  useLanguage,
  useLatest,
  usePermissions,
  usePluginTranslation,
  useSize,
  useWidget,
  type PluginModule,
  type WidgetComponent,
  type WidgetProps
} from './runtime'
export type { PluginTranslations, TranslateFunction } from './translate'
export { getErrorCode, TesseraError, type WidgetIdentity } from './bridge'

// Toujours disponibles
export { openContextMenu, openExternal, type MenuAction, type MenuItem } from './apis'

// Fichiers (permission `files`)
export { usePluginFiles, type PluginFiles } from './apis'
export type { PluginFileEntry, PluginFileErrorCode } from '../../../src/shared/plugin-files'
export { getPluginFileErrorCode, isValidFileName } from '../../../src/shared/plugin-files'

// Programmes (permission `processes`)
export { useProcesses, type PluginProcesses } from './apis'
export type {
  ConsoleMode,
  LaunchableKind,
  LaunchOptions,
  PickedTarget,
  ProcessErrorCode,
  ProcessRun
} from '../../../src/shared/plugin-processes'
export {
  defaultConsoleMode,
  getLaunchableKind,
  getProcessErrorCode,
  targetName
} from '../../../src/shared/plugin-processes'

// Notifications (permission `notifications`)
export { useNotifications, type PluginNotifications } from './apis'
export type { NotifyInput } from '../../../src/shared/notifications'

// Mails (permission `mail`)
export { useMail, useMailAccounts, useMailArrivals, type PluginMail } from './data'
export type { ModuleMailAccount as MailAccount } from '../../../src/shared/module-bridge'
export type {
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
} from '../../../src/shared/mail'
export {
  DEFAULT_QUERY,
  FOLDER_ORDER,
  formatAddress,
  getMailErrorCode,
  INBOX,
  parseAddressList
} from '../../../src/shared/mail'

// YouTube et Twitch (permission `media`)
export {
  useMedia,
  useMediaStatus,
  useTwitchLive,
  useYouTubeAccounts,
  type PluginMedia
} from './data'
export type {
  MediaStatus,
  TwitchChannel,
  TwitchStream,
  YouTubeAccount,
  YouTubePlaylist,
  YouTubeSearch,
  YouTubeVideo
} from '../../../src/shared/media'

// Vidéos et musiques du PC (permission `videos`)
export { useLocalMedia, type PluginLocalMedia } from './data'
export type { ExternalPlayer, LocalMediaFile } from '../../../src/shared/local-media'
export { isLocalMediaUrl, localMediaUrl } from '../../../src/shared/local-media'

// Applications installées (permission `apps`)
export { useInstalledApps } from './data'
export type { ModuleInstalledApp as UserInstalledApp } from '../../../src/shared/module-bridge'

// Notifications cliquées (permission `notifications`)
export { useNotificationTarget } from './data'

// Composants d'interface
export {
  Button,
  ConfirmDialog,
  Dialog,
  SegmentedControl,
  Select,
  Switch,
  type ButtonProps,
  type ConfirmAction,
  type ConfirmDialogProps,
  type DialogProps,
  type SegmentedControlProps,
  type SegmentedOption,
  type SelectOption,
  type SelectProps,
  type SwitchProps
} from './ui/components'
