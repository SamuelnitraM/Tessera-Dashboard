/**
 * Modules tiers : extensions installées par l'utilisateur depuis un fichier `.tessera`.
 *
 * Contrairement aux extensions intégrées (compilées avec l'app), un module s'exécute isolé :
 * chaque bloc est un cadre (iframe) servi par le protocole `tessera-module://`, avec sa propre
 * origine et son propre processus. Il ne parle à Tessera que par messages (voir module-bridge.ts).
 *
 * Paquet `.tessera` (archive zip) :
 * - un module : `manifest.json` à la racine, et les fichiers construits (`index.js`…) ;
 * - une collection : `collection.json` à la racine, et un dossier `modules/<id>/` par module.
 */

import { LOCAL_MEDIA_SCHEME } from './local-media'
import {
  localize,
  parseManifest,
  type LocalizedText,
  type PluginManifest,
  type PluginPermission
} from './plugins'
import type { Language } from './settings'

/** Protocole qui sert le code des modules. */
export const MODULE_SCHEME = 'tessera-module'

/** Extension des paquets de modules et de collections. */
export const MODULE_PACKAGE_EXTENSION = 'tessera'

/** Préfixe réservé aux extensions fournies avec Tessera. */
export const RESERVED_PREFIX = 'tessera.'

/**
 * Permissions réservées aux extensions intégrées : un module tiers qui en demande une est
 * refusé à l'installation (`integrations` : connexion aux applications dédiées de l'étape 14).
 */
export const BUILT_IN_ONLY_PERMISSIONS: readonly string[] = ['integrations']

/** Message de refus si le manifeste d'un module tiers demande une permission réservée. */
export function reservedPermissionError(permissions: readonly string[]): string | null {
  const reserved = permissions.find((permission) => BUILT_IN_ONLY_PERMISSIONS.includes(permission))
  return reserved
    ? `permissions : « ${reserved} » est réservée aux extensions fournies avec Tessera.`
    : null
}

/** Limites d'un paquet (contre les archives piégées). */
export const PACKAGE_LIMITS = {
  /** Taille du fichier `.tessera`. */
  archiveBytes: 50 * 1024 * 1024,
  /** Taille totale une fois décompressé. */
  totalBytes: 100 * 1024 * 1024,
  /** Nombre de fichiers. */
  entries: 2000,
  /** Modules d'une collection. */
  modules: 30
} as const

/**
 * Nom d'hôte d'un module dans `tessera-module://` : les points deviennent `--`.
 * Sans point, chaque module est son propre « site » pour Chromium, donc son propre processus
 * (`acme.demo` et `x.acme.demo` partageraient sinon le même). L'identifiant ne pouvant pas
 * contenir `--`, la conversion est réversible.
 */
export function moduleHost(pluginId: string): string {
  return pluginId.replaceAll('.', '--')
}

export function moduleIdFromHost(host: string): string {
  return host.replaceAll('--', '.')
}

/** Origine d'un module, ex. `tessera-module://acme--meteo`. */
export function moduleOrigin(pluginId: string): string {
  return `${MODULE_SCHEME}://${moduleHost(pluginId)}`
}

/** Page d'accueil d'un bloc de module, générée par Tessera. */
export const MODULE_WIDGET_PAGE = '/__tessera/widget.html'

// ---------------------------------------------------------------------------
// Modules installés
// ---------------------------------------------------------------------------

/** Provenance d'un module : paquet installé, ou dossier chargé en mode développeur. */
export type ModuleSource = 'package' | 'dev'

/** Collection d'origine d'un module (pour les regrouper dans Paramètres). */
export interface ModuleCollectionRef {
  id: string
  name: LocalizedText
}

/** Module installé, tel que le voit l'interface. */
export interface InstalledModule {
  id: string
  /** `null` si le manifeste est devenu illisible (dossier de développement modifié…). */
  manifest: PluginManifest | null
  error: string | null
  source: ModuleSource
  /** Dossier du module (mode développeur : le dossier choisi). */
  folder: string
  /** Permissions accordées par l'utilisateur (toujours incluses dans celles du manifeste). */
  granted: PluginPermission[]
  collection: ModuleCollectionRef | null
  installedAt: number
  /** Empreinte de la clé de l'éditeur si le paquet installé était signé (`null` : non signé). */
  publisher: string | null
  /** Augmente à chaque rechargement : les blocs du module se rechargent. */
  revision: number
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export interface CollectionManifest {
  id: string
  version: string
  name: LocalizedText
  description: LocalizedText
  author: string
  /** Identifiants des modules de la collection (un dossier `modules/<id>/` chacun). */
  modules: string[]
}

export type CollectionResult =
  { ok: true; collection: CollectionManifest } | { ok: false; error: string }

/**
 * Valide un `collection.json`. Les règles de `id`, `version`, `name`… sont celles du manifeste
 * d'un module : on les réutilise en validant un manifeste équivalent sans widget.
 */
export function parseCollection(input: unknown): CollectionResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'collection : objet attendu' }
  }
  const raw = input as Record<string, unknown>
  const base = parseManifest({ ...raw, apiVersion: 1, widgets: [], permissions: [] })
  if (!base.ok) return { ok: false, error: base.error }

  const list = raw.modules
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, error: 'modules : liste non vide d’identifiants attendue' }
  }
  if (list.length > PACKAGE_LIMITS.modules) {
    return { ok: false, error: `modules : ${PACKAGE_LIMITS.modules} modules au maximum` }
  }
  const modules: string[] = []
  for (const [index, id] of list.entries()) {
    if (typeof id !== 'string' || !isModuleId(id)) {
      return { ok: false, error: `modules[${index}] : identifiant invalide (« ${String(id)} »)` }
    }
    if (modules.includes(id)) return { ok: false, error: `modules : « ${id} » en double` }
    modules.push(id)
  }

  const { id, version, name, description, author } = base.manifest
  return { ok: true, collection: { id, version, name, description, author, modules } }
}

/** Identifiant valide pour un module tiers (le préfixe `tessera.` est réservé). */
export function isModuleId(id: string): boolean {
  const probe = parseManifest({
    id,
    version: '1.0.0',
    apiVersion: 1,
    name: { en: 'x' },
    description: { en: 'x' },
    author: 'x',
    widgets: []
  })
  return probe.ok && !id.startsWith(RESERVED_PREFIX)
}

// ---------------------------------------------------------------------------
// Installation : aperçu, puis consentement
// ---------------------------------------------------------------------------

/** Un module du paquet, présenté dans la fenêtre d'installation. */
export interface ModulePreviewItem {
  id: string
  manifest: PluginManifest | null
  /** Raison pour laquelle ce module ne peut pas être installé. */
  error: string | null
  /**
   * Version déjà installée (mise à jour) : permissions qu'elle demandait, et celles accordées.
   * Une permission demandée pour la première fois est signalée comme nouvelle.
   */
  installed: {
    version: string
    permissions: PluginPermission[]
    granted: PluginPermission[]
    source: ModuleSource
    /** Empreinte de l'éditeur de la version installée (`null` : non signée). */
    publisher: string | null
  } | null
}

export interface ModulePreview {
  /** Jeton à rendre à `install` ou `cancel` (le paquet est extrait en attente). */
  token: string
  source: ModuleSource
  collection: CollectionManifest | null
  /** Empreinte de la clé de l'éditeur si le paquet est signé (et la signature valide). */
  publisher: string | null
  modules: ModulePreviewItem[]
}

/** Choix de l'utilisateur pour un module du paquet : l'installer, avec ces permissions. */
export interface ModuleSelection {
  id: string
  granted: PluginPermission[]
}

export interface UninstallOptions {
  /** Mettre à la Corbeille le dossier de fichiers du module (permission `files`). */
  trashFiles: boolean
}

/** Erreur d'installation lisible par l'interface : `[code] détail`. */
export type ModuleErrorCode =
  'invalid-package' | 'unsafe-package' | 'too-large' | 'expired' | 'not-found' | 'io'

export function getModuleErrorCode(error: unknown): ModuleErrorCode | null {
  const match = /\[([a-z-]+)\]/.exec(error instanceof Error ? error.message : String(error))
  return (match?.[1] as ModuleErrorCode | undefined) ?? null
}

/** Message d'une erreur venue du processus principal, sans le préfixe ajouté par l'IPC. */
export function moduleErrorDetail(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/^.*?\[[a-z-]+\]\s*/, '')
}

/** Nom affiché d'un module, même invalide. */
export function moduleName(module: InstalledModule, language: Language): string {
  return module.manifest ? localize(module.manifest.name, language) : module.id
}

// ---------------------------------------------------------------------------
// Sécurité du code servi
// ---------------------------------------------------------------------------

/**
 * Politique de sécurité (CSP) des pages d'un module : son propre code uniquement, aucun cadre,
 * et Internet limité aux adresses déclarées (permission `network`). Les fichiers du PC ne sont
 * lisibles qu'avec la permission `videos`, et seulement ceux choisis par l'utilisateur.
 */
export function moduleContentSecurityPolicy(
  manifest: PluginManifest,
  granted: readonly PluginPermission[]
): string {
  // Permissions déclarées ET accordées : une permission retirée ferme aussi ces accès
  const allowed = (permission: PluginPermission): boolean =>
    manifest.permissions.includes(permission) && granted.includes(permission)
  const remote = (allowed('network') ? manifest.network : []).join(' ')
  const videos = allowed('videos')
  const sources = (...base: string[]): string => [...base, remote].filter(Boolean).join(' ')
  return [
    "default-src 'none'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${sources("'self'", 'data:', 'blob:')}`,
    // Vidéos du PC choisies par l'utilisateur (permission `videos`), lues par `<video>`
    `media-src ${sources("'self'", 'data:', 'blob:', ...(videos ? [`${LOCAL_MEDIA_SCHEME}:`] : []))}`,
    `font-src ${sources("'self'", 'data:')}`,
    `connect-src ${sources("'self'")}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ')
}
