/**
 * Pont entre Tessera et le bloc d'un module tiers (iframe isolée).
 *
 * 1. Le module (SDK) signale qu'il est prêt : `window.parent.postMessage(ModuleReady, '*')`.
 * 2. Tessera crée un `MessageChannel` et envoie l'un des ports au cadre, uniquement à l'origine
 *    du module (`tessera-module://<id>`) : le port ne peut arriver qu'à lui.
 * 3. Tout passe ensuite par ce port. Tessera sait donc toujours de quel module et de quel bloc
 *    vient un message : l'identité n'est jamais fournie par le module lui-même.
 *
 * Ce fichier est partagé avec le SDK des modules (packages/module-sdk) : il ne doit dépendre
 * que de types.
 */

import type { MailAccount, MailAccountState } from './mail'
import type { MediaStatus, TwitchStream, YouTubeAccount } from './media'
import type { PluginPermission } from './plugins'
import type { Language } from './settings'

/** Version du pont. Le SDK l'annonce ; Tessera refuse une version qu'elle ne connaît pas. */
export const BRIDGE_VERSION = 1

/** Module -> Tessera, par `postMessage` (avant l'ouverture du port). */
export interface ModuleReady {
  tessera: 'ready'
  bridge: number
}

/** Tessera -> module, par `postMessage`, avec le port en pièce jointe. */
export interface ModuleConnect {
  tessera: 'connect'
}

/** Variables CSS de Tessera (couleurs, rayons…), avec leur valeur actuelle. */
export type ThemeTokens = Record<string, string>

/** État du bloc envoyé au module à la connexion, puis à chaque changement. */
export interface ModuleWidgetState {
  config: Record<string, unknown>
  editing: boolean
  language: Language
  theme: ThemeTokens
  /** Permissions accordées par l'utilisateur. */
  permissions: PluginPermission[]
}

/** Élément d'un menu du clic droit demandé par un module. */
export type BridgeMenuItem =
  { id: number; label: string; danger?: boolean; disabled?: boolean } | 'separator'

/** Erreur renvoyée au module : message, et code lisible s'il y en a un (`permission`…). */
export interface BridgeError {
  message: string
  code: string | null
}

/** Messages de Tessera vers le module (sur le port). */
export type HostMessage =
  | {
      type: 'init'
      pluginId: string
      widgetType: string
      instanceId: string
      state: ModuleWidgetState
    }
  /**
   * Nouvel état du bloc. `ack` : numéro du dernier `setConfig` du module déjà appliqué dans
   * cette configuration. Le module réapplique par-dessus ses modifications plus récentes, encore
   * en route : un état envoyé avant leur arrivée ne les efface pas (pas de clic perdu).
   */
  | { type: 'state'; state: Partial<ModuleWidgetState>; ack: number }
  | { type: 'result'; id: number; ok: true; value: unknown }
  | { type: 'result'; id: number; ok: false; error: BridgeError }
  /** Événement d'une API (changement de dossier, sortie d'un programme…). */
  | { type: 'event'; name: BridgeEventName; args: unknown[] }
  /** Choix dans un menu du clic droit (`null` : menu fermé sans choix). */
  | { type: 'menu'; menu: number; item: number | null }
  /** Le module répond-il encore ? (réponse attendue : `pong`, sinon son processus a planté) */
  | { type: 'ping'; id: number }

/** Messages du module vers Tessera (sur le port). */
export type ModuleMessage =
  | { type: 'call'; id: number; method: string; args: unknown[] }
  /** Modification de la configuration, numérotée (1, 2, 3…) pour les accusés de réception. */
  | { type: 'setConfig'; seq: number; patch: Record<string, unknown> }
  | { type: 'contextMenu'; menu: number; x: number; y: number; items: BridgeMenuItem[] }
  /** Erreur non rattrapée dans le module : Tessera affiche l'écran d'erreur du bloc. */
  | { type: 'crash'; message: string }
  | { type: 'pong'; id: number }
  /**
   * Clic droit que le module n'a pas utilisé (`preventDefault`) : Tessera ouvre le menu du bloc
   * (réglages, retrait…), comme sur un widget intégré.
   */
  | { type: 'blockMenu'; x: number; y: number }
  /**
   * Raccourci clavier tapé dans le bloc et non utilisé par le module (Échap, ou une touche avec
   * Ctrl / Alt / Windows) : Tessera l'applique comme s'il avait été tapé dans l'interface.
   */
  | {
      type: 'key'
      key: string
      code: string
      ctrl: boolean
      alt: boolean
      shift: boolean
      meta: boolean
    }

export type BridgeEventName =
  | 'files:changed'
  | 'processes:changed'
  | 'processes:output'
  /** Comptes mail ou leur état ont changé (`ModuleMailSnapshot`, compte qui a reçu des mails). */
  | 'mail:changed'
  /** Comptes YouTube / Twitch ou directs Twitch ont changé (`ModuleMediaSnapshot`). */
  | 'media:changed'
  /** Applications installées de l'utilisateur (`ModuleInstalledApp[]`). */
  | 'apps:changed'
  /** Notification du module cliquée : ce qu'elle désigne (`target` de `notify`). */
  | 'notification:target'

// ---------------------------------------------------------------------------
// Données transmises aux modules (sans rien de sensible : ni serveur, ni identifiant)
// ---------------------------------------------------------------------------

/** Compte mail, tel que le voit un module. */
export interface ModuleMailAccount {
  id: string
  provider: MailAccount['provider']
  name: string
  address: string
}

export interface ModuleMailSnapshot {
  accounts: ModuleMailAccount[]
  states: Record<string, MailAccountState>
}

export interface ModuleMediaSnapshot {
  status: MediaStatus
  /** Comptes YouTube connectés, avec leur erreur de connexion. */
  youtubeAccounts: (YouTubeAccount & { error: string | null })[]
  /** Directs des chaînes Twitch suivies (dernière vérification). */
  live: TwitchStream[]
}

/** Application installée de l'utilisateur (Paramètres → Applications). */
export interface ModuleInstalledApp {
  id: string
  name: string
  /** Icône (image `data:`), ou `null`. */
  icon: string | null
}

/** Taille maximale de la configuration d'un bloc (enregistrée dans dashboard.json). */
export const MAX_MODULE_CONFIG_BYTES = 256 * 1024
