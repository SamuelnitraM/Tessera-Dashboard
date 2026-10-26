import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, statSync, watch, type FSWatcher } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { app, dialog, session, shell, type BrowserWindow } from 'electron'
import {
  isModuleId,
  moduleOrigin,
  PACKAGE_LIMITS,
  parseCollection,
  RESERVED_PREFIX,
  reservedPermissionError,
  type CollectionManifest,
  type InstalledModule,
  type ModuleCollectionRef,
  type ModulePreview,
  type ModulePreviewItem,
  type ModuleSelection,
  type ModuleSource,
  type UninstallOptions
} from '@shared/modules'
import {
  PLUGIN_FILES_ROOT,
  PLUGIN_PERMISSIONS,
  parseManifest,
  type PluginManifest,
  type PluginPermission
} from '@shared/plugins'
import { SIGNATURE_FILE } from '@shared/module-signature'
import { pluginSource } from '@shared/notifications'
import { errorText, getTranslation } from '../i18n'
import { JsonStore } from '../json-store'
import { getSettings, updateSettings } from '../settings-store'
import { builtInFileFolders, getBuiltInManifest } from './builtin'
import { forgetProcessApprovals } from './processes'
import { verifyPackageSignature, type PackagePublisher } from './signature'
import { checkEntryPath, readZip, UnsafePackageError } from './zip'

/**
 * Modules tiers installés par l'utilisateur.
 *
 * - Paquets : extraits dans `%APPDATA%\Tessera Dashboard\modules\<id>\`.
 * - Mode développeur : servis directement depuis le dossier choisi (son sous-dossier `dist`
 *   s'il contient le manifeste), surveillé pour recharger les blocs à chaque construction.
 *
 * `modules.json` garde la liste, les permissions accordées et les dossiers de fichiers
 * réservés. Une installation passe par deux temps : `preview*` extrait et valide le paquet
 * à part (`modules\.staging`), puis `installPreview` l'installe avec le consentement de
 * l'utilisateur. Une installation ratée ne touche donc jamais la version en place.
 */

interface ModuleRecord {
  id: string
  source: ModuleSource
  /** Mode développeur : dossier choisi par l'utilisateur. */
  path: string | null
  granted: PluginPermission[]
  collection: ModuleCollectionRef | null
  installedAt: number
  /**
   * Éditeur du paquet installé s'il était signé (confiance à la première utilisation) : ses
   * mises à jour doivent être signées par la même clé.
   */
  publisher: PackagePublisher | null
}

interface ModulesFile {
  modules: ModuleRecord[]
  /**
   * Dossiers de fichiers (permission `files`) déjà attribués : nom en minuscules -> module.
   * Gardés après une désinstallation (sauf fichiers mis à la Corbeille), pour qu'un autre
   * module ne récupère jamais les fichiers d'un précédent.
   */
  folders: Record<string, string>
}

function moduleError(code: string, detail: string): Error {
  return new Error(`[${code}] ${detail}`)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const store = new JsonStore<ModulesFile>('modules.json', (input) => {
  const root = isRecord(input) ? input : {}
  const modules: ModuleRecord[] = []
  for (const item of Array.isArray(root.modules) ? root.modules : []) {
    if (!isRecord(item) || typeof item.id !== 'string' || !isModuleId(item.id)) continue
    if (modules.some((other) => other.id === item.id)) continue
    const source: ModuleSource = item.source === 'dev' ? 'dev' : 'package'
    const path = typeof item.path === 'string' ? item.path : null
    if (source === 'dev' && !path) continue
    const collection =
      isRecord(item.collection) &&
      typeof item.collection.id === 'string' &&
      isRecord(item.collection.name)
        ? { id: item.collection.id, name: item.collection.name }
        : null
    modules.push({
      id: item.id,
      source,
      path: source === 'dev' ? path : null,
      granted: Array.isArray(item.granted)
        ? item.granted.filter((p): p is PluginPermission =>
            PLUGIN_PERMISSIONS.includes(p as PluginPermission)
          )
        : [],
      collection,
      installedAt: typeof item.installedAt === 'number' ? item.installedAt : 0,
      publisher:
        source === 'package' &&
        isRecord(item.publisher) &&
        typeof item.publisher.publicKey === 'string' &&
        typeof item.publisher.fingerprint === 'string'
          ? { publicKey: item.publisher.publicKey, fingerprint: item.publisher.fingerprint }
          : null
    })
  }
  const folders: Record<string, string> = {}
  for (const [folder, owner] of Object.entries(isRecord(root.folders) ? root.folders : {})) {
    if (typeof owner === 'string') folders[folder.toLowerCase()] = owner
  }
  return { modules, folders }
})

export const flushModules = (): void => store.flush()

const modulesRoot = (): string => join(app.getPath('userData'), 'modules')
const stagingRoot = (): string => join(modulesRoot(), '.staging')

// ---------------------------------------------------------------------------
// Modules chargés
// ---------------------------------------------------------------------------

interface LoadedModule {
  record: ModuleRecord
  manifest: PluginManifest | null
  error: string | null
  /** Dossier servi par `tessera-module://`. */
  folder: string
  revision: number
}

const loaded = new Map<string, LoadedModule>()
let onChange: (modules: InstalledModule[]) => void = () => {}

export function setModulesListener(listener: (modules: InstalledModule[]) => void): void {
  onChange = listener
}

function notify(): void {
  onChange(listModules())
}

/** Charge les modules installés. À appeler une fois, au démarrage. */
export function loadModules(): void {
  store.load()
  for (const record of store.get().modules) {
    loadModule(record)
    if (record.source === 'dev') watchDevFolder(record.id)
  }
  // Restes d'une installation interrompue
  void rm(stagingRoot(), { recursive: true, force: true }).catch(() => {})
}

/** Mode développeur : le manifeste peut être à la racine du dossier ou dans `dist`. */
function servedFolder(folder: string): string {
  const dist = join(folder, 'dist')
  return existsSync(join(dist, 'manifest.json')) ? dist : folder
}

function loadModule(record: ModuleRecord): LoadedModule {
  const folder =
    record.source === 'dev' && record.path
      ? servedFolder(record.path)
      : join(modulesRoot(), record.id)
  const { manifest, error } = readModuleManifest(folder, (manifest) =>
    manifest.id !== record.id
      ? errorText('modules', 'idChanged', { id: manifest.id, expected: record.id })
      : checkModuleFiles(manifest, folder)
  )
  const module: LoadedModule = {
    record,
    manifest,
    error,
    folder,
    revision: (loaded.get(record.id)?.revision ?? 0) + 1
  }
  loaded.set(record.id, module)
  return module
}

/**
 * Lit le manifeste d'un dossier de module, puis applique `check` (règles supplémentaires).
 * Le manifeste n'est renvoyé que s'il est valide et passe `check`.
 */
function readModuleManifest(
  folder: string,
  check: (manifest: PluginManifest) => string | null
): { manifest: PluginManifest | null; error: string | null } {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8').replace(/^\uFEFF/, ''))
  } catch (cause) {
    return {
      manifest: null,
      error:
        (cause as NodeJS.ErrnoException).code === 'ENOENT'
          ? errorText('modules', 'noManifest')
          : errorText('modules', 'manifestUnreadable', { detail: (cause as Error).message })
    }
  }
  const result = parseManifest(raw)
  if (!result.ok) return { manifest: null, error: `manifest.json → ${result.error}` }
  const error = check(result.manifest)
  return error ? { manifest: null, error } : { manifest: result.manifest, error: null }
}

function describe(module: LoadedModule): InstalledModule {
  const { record, manifest } = module
  return {
    id: record.id,
    manifest,
    error: module.error,
    source: record.source,
    folder: record.source === 'dev' && record.path ? record.path : module.folder,
    // Les permissions accordées restent bornées par celles du manifeste actuel
    granted: manifest ? record.granted.filter((p) => manifest.permissions.includes(p)) : [],
    collection: record.collection,
    installedAt: record.installedAt,
    publisher: record.publisher?.fingerprint ?? null,
    revision: module.revision
  }
}

export function listModules(): InstalledModule[] {
  return [...loaded.values()].map(describe).sort((a, b) => a.id.localeCompare(b.id))
}

/** Manifeste d'un module installé et valide. */
export function getModuleManifest(pluginId: string): PluginManifest | undefined {
  return loaded.get(pluginId)?.manifest ?? undefined
}

export function getGrantedPermissions(pluginId: string): PluginPermission[] {
  const module = loaded.get(pluginId)
  return module ? describe(module).granted : []
}

/** Dossier servi d'un module valide et activé (protocole `tessera-module://`). */
export function getServedModule(
  pluginId: string
): { manifest: PluginManifest; folder: string; granted: PluginPermission[] } | null {
  const module = loaded.get(pluginId)
  if (!module?.manifest || getSettings().plugins.disabled.includes(pluginId)) return null
  return { manifest: module.manifest, folder: module.folder, granted: describe(module).granted }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Le script principal doit exister dans le dossier du module. */
function checkModuleFiles(manifest: PluginManifest, folder: string): string | null {
  const entry = resolve(folder, manifest.entry)
  if (!entry.startsWith(resolve(folder) + sep) || !existsSync(entry) || !statSync(entry).isFile()) {
    return errorText('modules', 'entryNotFound', { entry: manifest.entry })
  }
  return null
}

/**
 * Confiance à la première utilisation : un module installé depuis un paquet signé ne peut être
 * remplacé que par un paquet signé par la même clé.
 */
function checkPublisher(id: string, publisher: PackagePublisher | null): string | null {
  const installed = loaded.get(id)?.record
  if (installed?.source !== 'package' || !installed.publisher) return null
  if (!publisher) {
    return errorText('modules', 'unsignedUpdate', { installed: installed.publisher.fingerprint })
  }
  if (publisher.publicKey !== installed.publisher.publicKey) {
    return errorText('modules', 'otherKey', {
      fingerprint: publisher.fingerprint,
      installed: installed.publisher.fingerprint
    })
  }
  return null
}

/** Règles propres aux modules tiers (en plus de la validation du manifeste). */
function checkModuleManifest(manifest: PluginManifest): string | null {
  if (manifest.id.startsWith(RESERVED_PREFIX)) {
    return errorText('modules', 'reservedPrefix', { prefix: RESERVED_PREFIX })
  }
  if (getBuiltInManifest(manifest.id)) {
    return errorText('modules', 'builtIn', { id: manifest.id })
  }
  if (manifest.widgets.length === 0) return errorText('modules', 'noWidget')
  const reserved = reservedPermissionError(manifest.permissions)
  if (reserved) return reserved
  if (manifest.files) {
    const folder = manifest.files.folder.toLowerCase()
    const owner = store.get().folders[folder]
    if (builtInFileFolders().has(folder) || (owner && owner !== manifest.id)) {
      return errorText('modules', 'folderTaken', { folder: manifest.files.folder })
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Installation : aperçu, consentement, installation
// ---------------------------------------------------------------------------

interface PendingInstall {
  source: ModuleSource
  /** Paquet : dossier d'extraction. Mode développeur : dossier choisi. */
  folder: string
  collection: CollectionManifest | null
  /** Éditeur, si le paquet est signé. */
  publisher: PackagePublisher | null
  items: Map<string, { manifest: PluginManifest; folder: string }>
  createdAt: number
}

/** Installations en attente du consentement de l'utilisateur. */
const pending = new Map<string, PendingInstall>()
/** Au-delà, un aperçu est oublié (et ses fichiers extraits supprimés). */
const PENDING_TTL_MS = 30 * 60 * 1000

function forgetExpired(): void {
  for (const [token, install] of pending) {
    if (Date.now() - install.createdAt > PENDING_TTL_MS) void cancelPreview(token)
  }
}

function previewItem(
  id: string,
  manifest: PluginManifest | null,
  error: string | null
): ModulePreviewItem {
  const current = loaded.get(id)
  return {
    id,
    manifest,
    error,
    installed: current
      ? {
          version: current.manifest?.version ?? '?',
          permissions: current.manifest?.permissions ?? [],
          granted: current.record.granted,
          source: current.record.source,
          publisher: current.record.publisher?.fingerprint ?? null
        }
      : null
  }
}

function parseJson(content: Buffer | undefined, name: string): unknown {
  if (!content)
    throw moduleError('invalid-package', errorText('modules', 'missingInPackage', { name }))
  try {
    return JSON.parse(content.toString('utf8').replace(/^\uFEFF/, ''))
  } catch {
    throw moduleError('invalid-package', errorText('modules', 'invalidJson', { name }))
  }
}

/**
 * Ouvre un paquet `.tessera` (module ou collection) : il est lu, vérifié, puis extrait à part.
 * Renvoie l'aperçu à présenter à l'utilisateur avant l'installation.
 */
export async function previewPackage(path: string): Promise<ModulePreview> {
  forgetExpired()
  let files: Map<string, Buffer>
  let publisher: PackagePublisher | null
  try {
    const info = await stat(path)
    if (info.size > PACKAGE_LIMITS.archiveBytes) {
      throw moduleError('too-large', errorText('modules', 'packageTooLarge'))
    }
    files = readZip(await readFile(path))
    publisher = verifyPackageSignature(files)
    files.delete(SIGNATURE_FILE)
  } catch (error) {
    if (error instanceof UnsafePackageError) throw moduleError('unsafe-package', error.message)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw moduleError('not-found', errorText('common', 'fileNotFound'))
    }
    throw error
  }

  // Module seul (manifest.json à la racine), ou collection (collection.json + modules/<id>/)
  let collection: CollectionManifest | null = null
  const groups = new Map<string, Map<string, Buffer>>()
  if (files.has('collection.json')) {
    const result = parseCollection(parseJson(files.get('collection.json'), 'collection.json'))
    if (!result.ok) throw moduleError('invalid-package', `collection.json → ${result.error}`)
    collection = result.collection
    for (const id of collection.modules) groups.set(id, new Map())
    for (const [name, content] of files) {
      const match = /^modules\/([^/]+)\/(.+)$/.exec(name)
      if (match && groups.has(match[1])) groups.get(match[1])?.set(match[2], content)
    }
  } else if (files.has('manifest.json')) {
    groups.set('', files)
  } else {
    throw moduleError('invalid-package', errorText('modules', 'noRootManifest'))
  }

  const token = randomUUID()
  const staging = join(stagingRoot(), token)
  const install: PendingInstall = {
    source: 'package',
    folder: staging,
    collection,
    publisher,
    items: new Map(),
    createdAt: Date.now()
  }
  const items: ModulePreviewItem[] = []

  try {
    for (const [expectedId, group] of groups) {
      const label = expectedId ? `modules/${expectedId}/manifest.json` : 'manifest.json'
      if (!group.has('manifest.json')) {
        items.push(
          previewItem(expectedId, null, errorText('modules', 'missingInPackage', { name: label }))
        )
        continue
      }
      const result = parseManifest(parseJson(group.get('manifest.json'), label))
      if (!result.ok) {
        items.push(previewItem(expectedId || '?', null, `${label} → ${result.error}`))
        continue
      }
      const { manifest } = result
      const error =
        expectedId && manifest.id !== expectedId
          ? errorText('modules', 'wrongId', { label, id: manifest.id, expected: expectedId })
          : (checkModuleManifest(manifest) ?? checkPublisher(manifest.id, publisher))
      if (error || items.some((item) => item.id === manifest.id)) {
        items.push(previewItem(manifest.id, manifest, error ?? errorText('modules', 'duplicate')))
        continue
      }

      // Extraction : chaque chemin a été vérifié à la lecture, on revérifie qu'il reste dedans
      const folder = join(staging, manifest.id)
      for (const [name, content] of group) {
        const target = resolve(folder, checkEntryPath(name))
        if (!target.startsWith(resolve(folder) + sep)) {
          throw moduleError('unsafe-package', errorText('modules', 'pathRejected', { name }))
        }
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, content)
      }
      const filesError = checkModuleFiles(manifest, folder)
      items.push(previewItem(manifest.id, manifest, filesError))
      if (!filesError) install.items.set(manifest.id, { manifest, folder })
    }
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => {})
    throw error
  }

  pending.set(token, install)
  return {
    token,
    source: 'package',
    collection,
    publisher: publisher?.fingerprint ?? null,
    modules: items
  }
}

/** Mode développeur : choix d'un dossier de module, puis aperçu (comme pour un paquet). */
export async function previewDevFolder(
  window: BrowserWindow | null
): Promise<ModulePreview | null> {
  const t = getTranslation()
  const options: Electron.OpenDialogOptions = {
    title: t.settings.extensions.dev.pickTitle,
    properties: ['openDirectory']
  }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const chosen = result.filePaths[0]
  if (result.canceled || !chosen) return null
  return previewDevPath(chosen)
}

/** Mode développeur : aperçu d'un dossier de module (choisi, ou déposé sur la page). */
export function previewDevPath(chosen: string): ModulePreview {
  forgetExpired()
  if (typeof chosen !== 'string' || !existsSync(chosen) || !statSync(chosen).isDirectory()) {
    throw moduleError('not-found', errorText('common', 'folderNotFound'))
  }
  const folder = servedFolder(chosen)
  const { manifest, error } = readModuleManifest(
    folder,
    (manifest) => checkModuleManifest(manifest) ?? checkModuleFiles(manifest, folder)
  )

  const token = randomUUID()
  const install: PendingInstall = {
    source: 'dev',
    folder: chosen,
    collection: null,
    publisher: null,
    items: new Map(),
    createdAt: Date.now()
  }
  if (manifest && !error) install.items.set(manifest.id, { manifest, folder })
  pending.set(token, install)
  return {
    token,
    source: 'dev',
    collection: null,
    publisher: null,
    modules: [previewItem(manifest?.id ?? '?', manifest, error)]
  }
}

/** Abandonne une installation en attente (fichiers extraits supprimés). */
export async function cancelPreview(token: string): Promise<void> {
  const install = pending.get(token)
  pending.delete(token)
  if (install?.source === 'package') {
    await rm(install.folder, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Installe les modules choisis d'un aperçu, avec les permissions accordées par l'utilisateur
 * (toujours bornées par celles du manifeste). Remplace une version déjà installée.
 */
export async function installPreview(
  token: string,
  selection: ModuleSelection[]
): Promise<InstalledModule[]> {
  const install = pending.get(token)
  if (!install) throw moduleError('expired', errorText('modules', 'expired'))
  pending.delete(token)

  const installed: string[] = []
  try {
    for (const choice of Array.isArray(selection) ? selection : []) {
      const item = install.items.get(choice?.id)
      if (!item) continue
      const { manifest } = item
      const granted = (Array.isArray(choice.granted) ? choice.granted : []).filter((p) =>
        manifest.permissions.includes(p)
      )

      if (install.source === 'package') await moveIntoPlace(manifest.id, item.folder)
      stopWatching(manifest.id)

      const data = store.get()
      const previous = data.modules.find((record) => record.id === manifest.id)
      const record: ModuleRecord = {
        id: manifest.id,
        source: install.source,
        path: install.source === 'dev' ? install.folder : null,
        granted: [...new Set(granted)],
        collection: install.collection
          ? { id: install.collection.id, name: install.collection.name }
          : (previous?.collection ?? null),
        installedAt: Date.now(),
        publisher: install.source === 'package' ? install.publisher : null
      }
      const folders = { ...data.folders }
      if (manifest.files) folders[manifest.files.folder.toLowerCase()] = manifest.id
      store.set({
        modules: [...data.modules.filter((other) => other.id !== manifest.id), record],
        folders
      })
      loadModule(record)
      if (record.source === 'dev') watchDevFolder(record.id)
      installed.push(manifest.id)
    }
  } finally {
    if (install.source === 'package') {
      await rm(install.folder, { recursive: true, force: true }).catch(() => {})
    }
    notify()
  }
  return listModules().filter((module) => installed.includes(module.id))
}

/** Remplace le dossier d'un module par sa nouvelle version, sans jamais rester à mi-chemin. */
async function moveIntoPlace(id: string, from: string): Promise<void> {
  const target = join(modulesRoot(), id)
  const old = join(modulesRoot(), '.staging', `${id}-old-${randomUUID()}`)
  await mkdir(modulesRoot(), { recursive: true })
  const hadPrevious = existsSync(target)
  if (hadPrevious) await rename(target, old)
  try {
    await rename(from, target)
  } catch (error) {
    if (hadPrevious) await rename(old, target).catch(() => {})
    throw moduleError(
      'io',
      errorText('modules', 'installFailed', { detail: (error as Error).message })
    )
  }
  if (hadPrevious) await rm(old, { recursive: true, force: true }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Gestion : permissions, rechargement, désinstallation
// ---------------------------------------------------------------------------

/** Change les permissions accordées (bornées par celles du manifeste). */
export function setGrantedPermissions(id: string, granted: PluginPermission[]): void {
  const module = loaded.get(id)
  if (!module || !Array.isArray(granted)) return
  const allowed = module.manifest?.permissions ?? []
  const record: ModuleRecord = {
    ...module.record,
    granted: [...new Set(granted.filter((p) => allowed.includes(p)))]
  }
  const data = store.get()
  store.set({ ...data, modules: data.modules.map((other) => (other.id === id ? record : other)) })
  module.record = record
  // Les blocs se rechargent : leur politique de sécurité (Internet, vidéos) suit les permissions
  module.revision++
  notify()
}

/** Relit le module (manifeste, fichiers) : ses blocs se rechargent. */
export function reloadModule(id: string): void {
  const module = loaded.get(id)
  if (!module) return
  loadModule(module.record)
  notify()
}

/** Désinstalle un module : son dossier, ses données de navigateur, ses autorisations. */
export async function uninstallModule(id: string, options: UninstallOptions): Promise<void> {
  const module = loaded.get(id)
  if (!module) throw moduleError('not-found', errorText('modules', 'notFound', { id }))
  stopWatching(id)
  loaded.delete(id)

  const data = store.get()
  const folders = { ...data.folders }
  const files = module.manifest?.files
  if (files && options?.trashFiles) {
    const folder = join(app.getPath('documents'), PLUGIN_FILES_ROOT, files.folder)
    if (existsSync(folder)) await shell.trashItem(folder).catch(() => {})
    delete folders[files.folder.toLowerCase()]
  }
  store.set({ modules: data.modules.filter((record) => record.id !== id), folders })

  // Paquet : le code installé est supprimé. Mode développeur : le dossier reste intact
  if (module.record.source === 'package') {
    await rm(join(modulesRoot(), id), { recursive: true, force: true }).catch(() => {})
  }
  await session.defaultSession.clearStorageData({ origin: moduleOrigin(id) }).catch(() => {})
  forgetProcessApprovals(id)

  // Réglages propres au module : notifications (source `plugin:<id>`) et activation
  const sources = getSettings().notifications.sources
  const source = pluginSource(id)
  if (source in sources) {
    const next = { ...sources }
    delete next[source]
    updateSettings({ notifications: { sources: next } })
  }
  const disabled = getSettings().plugins.disabled
  if (disabled.includes(id)) {
    updateSettings({ plugins: { disabled: disabled.filter((other) => other !== id) } })
  }
  notify()
}

// ---------------------------------------------------------------------------
// Mode développeur : rechargement automatique
// ---------------------------------------------------------------------------

const watchers = new Map<string, FSWatcher>()
const RELOAD_DELAY_MS = 300

function watchDevFolder(id: string): void {
  const path = loaded.get(id)?.record.path
  if (!path || watchers.has(id)) return
  let timer: NodeJS.Timeout | undefined
  try {
    const watcher = watch(path, { recursive: true }, (_event, fileName) => {
      // Les sources et dépendances ne comptent pas : seule la construction (dist) recharge
      const name = (fileName ?? '').replaceAll('\\', '/')
      if (/^(?:node_modules|\.git)(?:\/|$)/.test(name)) return
      const served = loaded.get(id)?.folder
      const relative = served && served !== path ? `${served.slice(path.length + 1)}/` : ''
      if (relative && !name.startsWith(relative.replaceAll('\\', '/')) && name !== 'dist') return
      clearTimeout(timer)
      timer = setTimeout(() => reloadModule(id), RELOAD_DELAY_MS)
    })
    watcher.on('error', () => stopWatching(id))
    watchers.set(id, watcher)
  } catch (error) {
    console.warn(`[modules] Surveillance impossible de ${path}`, error)
  }
}

function stopWatching(id: string): void {
  watchers.get(id)?.close()
  watchers.delete(id)
}
