/**
 * Format des extensions (plugins) de Tessera Dashboard.
 *
 * Une extension = un dossier contenant :
 * - `manifest.json` : description statique (identité, widgets, réglages). Lisible sans exécuter
 *   de code : l'app peut lister, valider ou désactiver une extension sans la charger.
 * - un module de code qui fournit les composants des widgets (voir le SDK côté interface).
 *
 * Le manifeste est validé par `parseManifest` : toute erreur est décrite précisément, pour être
 * affichée dans Paramètres → Extensions.
 */

import { isIntegrationId, type IntegrationId } from './integrations'
import type { Language } from './settings'

/** Version de l'API des extensions. Une extension déclare celle pour laquelle elle est écrite. */
export const PLUGIN_API_VERSION = 1

/** Texte traduit : au moins une langue, l'anglais servant de secours. */
export type LocalizedText = Partial<Record<Language, string>> & { en?: string }

export interface GridSizeSpec {
  w: number
  h: number
}

/** Réglage d'un widget, affiché automatiquement dans sa fenêtre de réglages. */
export type WidgetSettingField =
  | { key: string; type: 'boolean'; label: LocalizedText; default: boolean }
  | {
      key: string
      type: 'text'
      label: LocalizedText
      default: string
      maxLength: number
      placeholder?: LocalizedText
    }
  | {
      key: string
      type: 'number'
      label: LocalizedText
      default: number
      min: number
      max: number
      step: number
    }
  | {
      key: string
      type: 'select'
      label: LocalizedText
      default: string
      options: { value: string; label: LocalizedText }[]
    }

export interface WidgetManifest {
  /** Identifiant du widget dans l'extension (ex. `clock`). */
  type: string
  name: LocalizedText
  description: LocalizedText
  /** Nom d'une icône Lucide (https://lucide.dev/icons), ex. `clock`. */
  icon: string
  /** Tailles en cases de la disposition large (24 colonnes). */
  defaultSize: GridSizeSpec
  minSize: GridSizeSpec
  settings: WidgetSettingField[]
}

/**
 * Catégories des widgets et modules (classement dans Paramètres et « Ajouter un bloc »).
 * Une catégorie inconnue (version plus récente de Tessera) est rangée dans `other`.
 */
export const PLUGIN_CATEGORIES = [
  'video',
  'images',
  'communication',
  'productivity',
  'development',
  'apps',
  'info',
  'games',
  'tools',
  'other'
] as const
export type PluginCategory = (typeof PLUGIN_CATEGORIES)[number]

export interface PluginManifest {
  /** Identifiant unique, en notation pointée (ex. `tessera.clock`). */
  id: string
  version: string
  apiVersion: number
  name: LocalizedText
  description: LocalizedText
  author: string
  /** Catégorie de ses widgets (`other` si absente). */
  category: PluginCategory
  /** Accès supplémentaires demandés par l'extension (affichés dans Paramètres → Extensions). */
  permissions: PluginPermission[]
  /** Dossier de fichiers de l'extension (si elle demande la permission `files`). */
  files: { folder: string } | null
  /** Applications dont l'extension utilise le connecteur (si elle demande la permission `integrations`). */
  integrations: IntegrationId[] | null
  /**
   * Adresses que le module peut joindre (si il demande la permission `network`), ex.
   * `https://api.exemple.com` ou `https://*.exemple.com`. Sans elles : aucun accès à Internet.
   */
  network: string[]
  /** Script principal d'un module tiers, relatif à son dossier (`index.js` par défaut). */
  entry: string
  /** Site du module (facultatif), affiché dans Paramètres → Extensions. */
  homepage: string | null
  widgets: WidgetManifest[]
}

/**
 * Permissions qu'une extension peut demander.
 * - `files` : lire et écrire des fichiers, uniquement dans son dossier
 *   `Documents\Tessera Dashboard\<files.folder>`.
 * - `processes` : lancer et arrêter des programmes, uniquement ceux que l'utilisateur
 *   a choisis lui-même dans la fenêtre de sélection de Windows.
 * - `web` : afficher des pages web (composant `WebView` du SDK).
 * - `videos` : lire les vidéos et musiques du PC, uniquement celles que l'utilisateur a
 *   choisies (fenêtre de Windows ou glisser-déposer).
 * - `integrations` : lire les données et piloter des applications connues (DevLauncher,
 *   GitSpread, Prospect Solution), uniquement celles déclarées dans `integrations`.
 * - `network` : joindre Internet, uniquement les adresses déclarées dans `network` (modules tiers).
 */
export const PLUGIN_PERMISSIONS = [
  'files',
  'processes',
  'web',
  'apps',
  'notifications',
  'mail',
  'media',
  'videos',
  'integrations',
  'network'
] as const
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number]

/** Dossier racine des fichiers d'extensions, dans les Documents de l'utilisateur. */
export const PLUGIN_FILES_ROOT = 'Tessera Dashboard'

export type ManifestResult = { ok: true; manifest: PluginManifest } | { ok: false; error: string }

/** Clé complète d'un widget, unique dans toute l'app : `<extension>/<widget>`. */
export function widgetKey(pluginId: string, widgetType: string): string {
  return `${pluginId}/${widgetType}`
}

/** Texte dans la langue demandée, sinon en anglais, sinon dans la première langue disponible. */
export function localize(text: LocalizedText | undefined, language: Language): string {
  if (!text) return ''
  return text[language] ?? text.en ?? Object.values(text).find(Boolean) ?? ''
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const PLUGIN_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/
const LOCAL_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SETTING_KEY = /^[a-zA-Z][a-zA-Z0-9]*$/
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const MAX_GRID = 24

/** Erreur de validation, avec le chemin du champ fautif (ex. `widgets[0].minSize.w`). */
class ManifestError extends Error {}

type Raw = Record<string, unknown>

function fail(path: string, message: string): never {
  throw new ManifestError(`${path} : ${message}`)
}

function object(value: unknown, path: string): Raw {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'objet attendu')
  }
  return value as Raw
}

function string(value: unknown, path: string, pattern?: RegExp): string {
  if (typeof value !== 'string' || value.trim() === '') fail(path, 'texte non vide attendu')
  if (pattern && !pattern.test(value)) fail(path, `format invalide (« ${value} »)`)
  return value
}

function integer(value: unknown, path: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    fail(path, `entier entre ${min} et ${max} attendu`)
  }
  return value as number
}

function localized(value: unknown, path: string): LocalizedText {
  const raw = object(value, path)
  const text: LocalizedText = {}
  for (const [language, content] of Object.entries(raw)) {
    if (language !== 'fr' && language !== 'en') fail(`${path}.${language}`, 'langue inconnue')
    text[language] = string(content, `${path}.${language}`)
  }
  if (Object.keys(text).length === 0) fail(path, 'au moins une langue (fr ou en) attendue')
  return text
}

function size(value: unknown, path: string): GridSizeSpec {
  const raw = object(value, path)
  return { w: integer(raw.w, `${path}.w`, 1, MAX_GRID), h: integer(raw.h, `${path}.h`, 1, 100) }
}

function settingField(value: unknown, path: string): WidgetSettingField {
  const raw = object(value, path)
  const key = string(raw.key, `${path}.key`, SETTING_KEY)
  const label = localized(raw.label, `${path}.label`)

  switch (raw.type) {
    case 'boolean':
      if (typeof raw.default !== 'boolean') fail(`${path}.default`, 'booléen attendu')
      return { key, type: 'boolean', label, default: raw.default }
    case 'text': {
      const maxLength =
        raw.maxLength === undefined ? 200 : integer(raw.maxLength, `${path}.maxLength`, 1, 10_000)
      if (typeof raw.default !== 'string') fail(`${path}.default`, 'texte attendu')
      return {
        key,
        type: 'text',
        label,
        default: raw.default,
        maxLength,
        placeholder:
          raw.placeholder === undefined
            ? undefined
            : localized(raw.placeholder, `${path}.placeholder`)
      }
    }
    case 'number': {
      const min = typeof raw.min === 'number' ? raw.min : -Infinity
      const max = typeof raw.max === 'number' ? raw.max : Infinity
      const step = typeof raw.step === 'number' && raw.step > 0 ? raw.step : 1
      if (typeof raw.default !== 'number' || raw.default < min || raw.default > max) {
        fail(`${path}.default`, 'nombre compris entre min et max attendu')
      }
      return { key, type: 'number', label, default: raw.default, min, max, step }
    }
    case 'select': {
      if (!Array.isArray(raw.options) || raw.options.length === 0) {
        fail(`${path}.options`, 'liste non vide attendue')
      }
      const options = raw.options.map((option, index) => {
        const item = object(option, `${path}.options[${index}]`)
        return {
          value: string(item.value, `${path}.options[${index}].value`),
          label: localized(item.label, `${path}.options[${index}].label`)
        }
      })
      if (!options.some((option) => option.value === raw.default)) {
        fail(`${path}.default`, 'doit correspondre à une des options')
      }
      return { key, type: 'select', label, default: raw.default as string, options }
    }
    default:
      fail(`${path}.type`, 'boolean, text, number ou select attendu')
  }
}

function widget(value: unknown, path: string): WidgetManifest {
  const raw = object(value, path)
  const defaultSize = size(raw.defaultSize, `${path}.defaultSize`)
  const minSize = size(raw.minSize, `${path}.minSize`)
  if (minSize.w > defaultSize.w || minSize.h > defaultSize.h) {
    fail(`${path}.minSize`, 'ne peut pas dépasser defaultSize')
  }

  const settings = raw.settings === undefined ? [] : raw.settings
  if (!Array.isArray(settings)) fail(`${path}.settings`, 'liste attendue')
  const fields = settings.map((field, index) => settingField(field, `${path}.settings[${index}]`))
  const keys = new Set<string>()
  for (const field of fields) {
    if (keys.has(field.key)) fail(`${path}.settings`, `clé « ${field.key} » en double`)
    keys.add(field.key)
  }

  return {
    type: string(raw.type, `${path}.type`, LOCAL_ID),
    name: localized(raw.name, `${path}.name`),
    description: localized(raw.description, `${path}.description`),
    icon: string(raw.icon, `${path}.icon`, LOCAL_ID),
    defaultSize,
    minSize,
    settings: fields
  }
}

/** Nom de dossier lisible : lettres, chiffres, espaces, tirets et soulignés. */
const FOLDER_NAME = /^[\p{L}\p{N}][\p{L}\p{N} _-]{0,59}$/u

/**
 * Adresse joignable par un module : https ou wss, nom de domaine éventuellement précédé de `*.`
 * (sous-domaines), port facultatif. `http://localhost` est accepté pour le développement.
 */
const NETWORK_ORIGIN =
  /^(?:(?:https|wss):\/\/(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+|(?:http|ws):\/\/(?:localhost|127\.0\.0\.1))(?::\d{1,5})?$/
/** Chemin d'un fichier du module : segments simples, sans `..` ni chemin absolu. */
const ENTRY_PATH = /^(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*\.m?js$/

function permissionsAndFiles(
  raw: Raw
): Pick<PluginManifest, 'permissions' | 'files' | 'network' | 'integrations'> {
  const list = raw.permissions === undefined ? [] : raw.permissions
  if (!Array.isArray(list)) fail('permissions', 'liste attendue')
  const permissions = list.map((permission, index) => {
    if (!PLUGIN_PERMISSIONS.includes(permission as PluginPermission)) {
      fail(`permissions[${index}]`, `permission inconnue (« ${String(permission)} »)`)
    }
    return permission as PluginPermission
  })

  const wantsFiles = permissions.includes('files')
  if (wantsFiles !== (raw.files !== undefined)) {
    fail('files', 'à déclarer si, et seulement si, la permission « files » est demandée')
  }
  const files = wantsFiles
    ? { folder: string(object(raw.files, 'files').folder, 'files.folder', FOLDER_NAME) }
    : null

  const wantsNetwork = permissions.includes('network')
  if (wantsNetwork !== (raw.network !== undefined)) {
    fail('network', 'à déclarer si, et seulement si, la permission « network » est demandée')
  }
  let network: string[] = []
  if (wantsNetwork) {
    if (!Array.isArray(raw.network) || raw.network.length === 0) {
      fail('network', 'liste non vide d’adresses attendue (ex. « https://api.exemple.com »)')
    }
    if (raw.network.length > 50) fail('network', '50 adresses au maximum')
    network = [
      ...new Set(
        raw.network.map((origin, index) => string(origin, `network[${index}]`, NETWORK_ORIGIN))
      )
    ]
  }

  return {
    permissions: [...new Set(permissions)],
    files,
    network,
    integrations: integrationList(raw, permissions)
  }
}

/** Applications déclarées avec la permission `integrations` (voir `shared/integrations.ts`). */
function integrationList(raw: Raw, permissions: PluginPermission[]): IntegrationId[] | null {
  if (permissions.includes('integrations') !== (raw.integrations !== undefined)) {
    fail(
      'integrations',
      'à déclarer si, et seulement si, la permission « integrations » est demandée'
    )
  }
  if (raw.integrations === undefined) return null
  if (!Array.isArray(raw.integrations) || raw.integrations.length === 0) {
    fail('integrations', 'liste non vide attendue')
  }
  return [
    ...new Set(
      raw.integrations.map((id, index) => {
        if (!isIntegrationId(id))
          fail(`integrations[${index}]`, `application inconnue (« ${String(id)} »)`)
        return id
      })
    )
  ]
}

/** Valide un manifeste lu depuis un fichier `manifest.json`. */
export function parseManifest(input: unknown): ManifestResult {
  try {
    const raw = object(input, 'manifest')
    const apiVersion = integer(raw.apiVersion, 'apiVersion', 1, 1_000)
    if (apiVersion !== PLUGIN_API_VERSION) {
      fail(
        'apiVersion',
        `version ${apiVersion} non prise en charge (attendue : ${PLUGIN_API_VERSION})`
      )
    }
    if (!Array.isArray(raw.widgets)) fail('widgets', 'liste attendue')

    const widgets = raw.widgets.map((item, index) => widget(item, `widgets[${index}]`))
    const types = new Set<string>()
    for (const { type } of widgets) {
      if (types.has(type)) fail('widgets', `type « ${type} » en double`)
      types.add(type)
    }

    return {
      ok: true,
      manifest: {
        id: string(raw.id, 'id', PLUGIN_ID),
        version: string(raw.version, 'version', SEMVER),
        apiVersion,
        name: localized(raw.name, 'name'),
        description: localized(raw.description, 'description'),
        author: string(raw.author, 'author'),
        category:
          raw.category === undefined
            ? 'other'
            : (PLUGIN_CATEGORIES as readonly string[]).includes(string(raw.category, 'category'))
              ? (raw.category as PluginCategory)
              : 'other',
        ...permissionsAndFiles(raw),
        entry: raw.entry === undefined ? 'index.js' : string(raw.entry, 'entry', ENTRY_PATH),
        homepage:
          raw.homepage === undefined
            ? null
            : string(raw.homepage, 'homepage', /^https:\/\/[^\s]+$/),
        widgets
      }
    }
  } catch (error) {
    if (error instanceof ManifestError) return { ok: false, error: error.message }
    throw error
  }
}

/**
 * Configuration effective d'un widget : valeurs par défaut du manifeste, remplacées par celles
 * enregistrées si elles sont valides. Les clés inconnues du manifeste sont conservées telles quelles.
 */
export function resolveWidgetConfig(
  fields: readonly WidgetSettingField[],
  stored: Record<string, unknown>
): Record<string, unknown> {
  const config: Record<string, unknown> = { ...stored }
  for (const field of fields) {
    const value = stored[field.key]
    config[field.key] = isValidValue(field, value) ? value : field.default
  }
  return config
}

function isValidValue(field: WidgetSettingField, value: unknown): boolean {
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean'
    case 'text':
      return typeof value === 'string' && value.length <= field.maxLength
    case 'number':
      return typeof value === 'number' && value >= field.min && value <= field.max
    case 'select':
      return field.options.some((option) => option.value === value)
  }
}
