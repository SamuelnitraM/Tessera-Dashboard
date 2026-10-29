import { createElement, lazy, useState, type ComponentType } from 'react'
import type { i18n as I18n } from 'i18next'
import type { InstalledModule } from '@shared/modules'
import {
  parseManifest,
  widgetKey,
  type GridSizeSpec,
  type HeaderWidgetManifest,
  type PluginCategory,
  type PluginManifest,
  type WidgetManifest
} from '@shared/plugins'
import type { HeaderWidgetComponent, PluginModule, WidgetComponent } from '@tessera/plugin-sdk'
import type { PluginContextValue } from '../plugin-sdk/context'
import { ModuleFrame } from '../components/grid/ModuleFrame'
import { useModulesStore } from '../stores/modules'

/**
 * Registre des extensions.
 *
 * Les extensions intégrées vivent dans le dossier `plugins/` à la racine du projet : chaque
 * sous-dossier contenant un `manifest.json` et un `index.tsx` est découvert automatiquement
 * au build (aucune liste à tenir à jour). Les manifestes sont lus au démarrage (noms, tailles,
 * réglages) ; le code d'une extension (et ses textes) n'est chargé qu'au premier affichage d'un
 * de ses widgets (`loadPluginCode` le charge d'avance) : une extension inutilisée ne coûte rien.
 *
 * Les modules tiers, installés par l'utilisateur, viennent du processus principal (store
 * `modules`) : leurs widgets sont des cadres isolés (`ModuleFrame`). Les composants qui listent
 * les widgets s'abonnent à ce store (`useModules`) pour se réafficher quand il change.
 */

export interface LoadedPlugin {
  /** Identifiant du manifeste, ou nom du dossier si le manifeste est invalide. */
  id: string
  manifest: PluginManifest | null
  /** Message d'erreur si l'extension n'a pas pu être chargée. */
  error: string | null
  /** Fournie avec l'app (sinon : module tiers installé par l'utilisateur). */
  builtIn: boolean
  /** Module tiers : provenance, permissions accordées, collection… */
  module: InstalledModule | null
}

export interface RegisteredWidget {
  /** Clé complète, enregistrée dans dashboard.json : `<extension>/<widget>`. */
  key: string
  pluginId: string
  manifest: WidgetManifest
  component: WidgetComponent
  /** Identité et permissions de l'extension, fournies au widget par le SDK. */
  context: PluginContextValue
  /** Widget intégré à Tessera (sinon : module d'un développeur tiers). */
  builtIn: boolean
  /** Catégorie de son extension (classement dans « Ajouter un bloc »). */
  category: PluginCategory
}

/** Widget de la barre des pages fourni par une extension intégrée. */
export interface RegisteredHeaderWidget {
  /** Clé enregistrée dans la barre (`headerBar.items`) : `<extension>/<type>`. */
  key: string
  pluginId: string
  manifest: HeaderWidgetManifest
  component: HeaderWidgetComponent
  context: PluginContextValue
}

/** Bloc « application web » (extension intégrée tessera.web), configuré par `{ url, appId }`. */
export const WEB_APP_WIDGET = 'tessera.web/web'

const manifestFiles = import.meta.glob<unknown>('../../../../plugins/*/manifest.json', {
  eager: true,
  import: 'default'
})
const codeFiles = import.meta.glob<PluginModule>('../../../../plugins/*/index.tsx', {
  import: 'default'
})

const plugins: LoadedPlugin[] = []
const widgets = new Map<string, RegisteredWidget>()
const headerWidgets = new Map<string, RegisteredHeaderWidget>()
/** Chargement du code des extensions intégrées valides, par identifiant. */
const loaders = new Map<string, () => Promise<PluginModule>>()
const loading = new Map<string, Promise<PluginModule>>()
/** Code déjà arrivé : ses widgets s'affichent tout de suite, sans passer par Suspense. */
const loaded = new Map<string, PluginModule>()
/** i18next, pour y ajouter les textes d'une extension quand son code arrive. */
let translations: I18n | null = null

for (const [path, rawManifest] of Object.entries(manifestFiles)) {
  const folder = path.split('/').at(-2) ?? path
  const plugin = loadPlugin(
    folder,
    rawManifest,
    codeFiles[path.replace(/manifest\.json$/, 'index.tsx')]
  )
  plugins.push(plugin)
}
plugins.sort((a, b) => a.id.localeCompare(b.id))

function loadPlugin(
  folder: string,
  rawManifest: unknown,
  loader: (() => Promise<PluginModule>) | undefined
): LoadedPlugin {
  const invalid = (error: string): LoadedPlugin => ({
    id: folder,
    manifest: null,
    error,
    builtIn: true,
    module: null
  })

  const result = parseManifest(rawManifest)
  if (!result.ok) return invalid(`manifest.json → ${result.error}`)
  const { manifest } = result

  if (manifest.id !== folder) {
    return invalid(`Le dossier doit porter le nom de l'extension (« ${manifest.id} »).`)
  }
  if (loaders.has(manifest.id)) return invalid(`Identifiant « ${manifest.id} » déjà utilisé.`)
  if (!loader) return invalid('index.tsx doit exporter par défaut definePlugin({ widgets: … }).')

  loaders.set(manifest.id, loader)
  const context: PluginContextValue = { id: manifest.id, permissions: manifest.permissions }
  for (const widget of manifest.widgets) {
    const key = widgetKey(manifest.id, widget.type)
    widgets.set(key, {
      key,
      pluginId: manifest.id,
      manifest: widget,
      component: lazyComponent(manifest.id, (module) => module.widgets?.[widget.type], widget.type),
      context,
      builtIn: true,
      category: manifest.category
    })
  }
  for (const widget of manifest.headerWidgets) {
    const key = widgetKey(manifest.id, widget.type)
    headerWidgets.set(key, {
      key,
      pluginId: manifest.id,
      manifest: widget,
      component: lazyComponent(
        manifest.id,
        (module) => module.headerWidgets?.[widget.type],
        widget.type
      ),
      context
    })
  }
  return { id: manifest.id, manifest, error: null, builtIn: true, module: null }
}

/**
 * Code d'une extension intégrée (chargé une fois) ; ses textes sont ajoutés à i18next avant
 * qu'un de ses widgets ne s'affiche.
 */
function loadModule(pluginId: string): Promise<PluginModule> {
  let promise = loading.get(pluginId)
  if (!promise) {
    const loader = loaders.get(pluginId)
    promise = loader
      ? loader().then((module) => {
          if (!module || typeof module.widgets !== 'object') {
            throw new Error('index.tsx doit exporter par défaut definePlugin({ widgets: … }).')
          }
          addTranslations(pluginId, module)
          loaded.set(pluginId, module)
          return module
        })
      : Promise.reject(new Error(`Extension « ${pluginId} » introuvable.`))
    loading.set(pluginId, promise)
  }
  return promise
}

/**
 * Composant d'un widget. Code de l'extension déjà chargé (page d'accueil, chargement d'avance) :
 * affiché directement. Sinon chargé avec React.lazy (Suspense n'affiche rien en attendant ; une
 * erreur arrive à la barrière d'erreur du bloc). React retarde d'environ 300 ms le contenu qui
 * remplace une attente : d'où l'affichage direct dès que possible.
 */
function lazyComponent<P>(
  pluginId: string,
  pick: (module: PluginModule) => ComponentType<P> | undefined,
  type: string
): ComponentType<P> {
  const componentOf = (module: PluginModule): ComponentType<P> => {
    const component = pick(module)
    if (typeof component !== 'function') {
      throw new Error(`Aucun composant fourni pour le widget « ${type} ».`)
    }
    return component
  }
  const Lazy = lazy(async () => ({ default: componentOf(await loadModule(pluginId)) }))
  function PluginComponent(props: P): React.JSX.Element {
    // Choisi au premier affichage du bloc et gardé (changer de type d'élément le recréerait)
    const [direct] = useState(() => loaded.has(pluginId))
    const module = loaded.get(pluginId)
    return direct && module
      ? createElement(componentOf(module) as ComponentType<object>, props as object)
      : createElement(Lazy as unknown as ComponentType<object>, props as object)
  }
  PluginComponent.displayName = `Plugin(${pluginId}/${type})`
  return PluginComponent
}

/** Charge d'avance le code de ces extensions (celles de la page affichée au démarrage…). */
export async function loadPluginCode(pluginIds: Iterable<string>): Promise<void> {
  await Promise.all(
    [...new Set(pluginIds)]
      .filter((id) => loaders.has(id))
      .map((id) => loadModule(id).catch(() => undefined))
  )
}

/** Code arrivé avant l'initialisation d'i18next : ses textes sont ajoutés à ce moment-là. */
const waitingTranslations = new Map<string, PluginModule>()

function addTranslations(pluginId: string, module: PluginModule): void {
  if (!translations) {
    waitingTranslations.set(pluginId, module)
    return
  }
  for (const [language, strings] of Object.entries(module.translations ?? {})) {
    translations.addResourceBundle(language, pluginId, strings, true, true)
  }
}

// ---------------------------------------------------------------------------
// Modules tiers
// ---------------------------------------------------------------------------

/**
 * Composant d'un widget de module : toujours le même pour une clé donnée, pour que React ne
 * recrée pas le cadre (et ne recharge pas le module) à chaque changement de la liste.
 */
const moduleComponents = new Map<string, WidgetComponent>()

function moduleComponent(pluginId: string, widgetType: string): WidgetComponent {
  const key = widgetKey(pluginId, widgetType)
  let component = moduleComponents.get(key)
  if (!component) {
    component = (props) => createElement(ModuleFrame, { ...props, pluginId, widgetType })
    component.displayName = `Module(${key})`
    moduleComponents.set(key, component)
  }
  return component
}

interface ModuleRegistry {
  source: InstalledModule[]
  plugins: LoadedPlugin[]
  widgets: Map<string, RegisteredWidget>
}

let moduleRegistry: ModuleRegistry | null = null

/** Extensions et widgets des modules installés, recalculés quand la liste change. */
function getModuleRegistry(): ModuleRegistry {
  const source = useModulesStore.getState().modules
  if (moduleRegistry?.source === source) return moduleRegistry

  const moduleWidgets = new Map<string, RegisteredWidget>()
  const modulePlugins = source.map((module): LoadedPlugin => {
    const { manifest } = module
    if (manifest && !module.error) {
      const context: PluginContextValue = { id: module.id, permissions: module.granted }
      for (const widget of manifest.widgets) {
        const key = widgetKey(module.id, widget.type)
        moduleWidgets.set(key, {
          key,
          pluginId: module.id,
          manifest: widget,
          component: moduleComponent(module.id, widget.type),
          context,
          builtIn: false,
          category: manifest.category ?? 'other'
        })
      }
    }
    return { id: module.id, manifest, error: module.error, builtIn: false, module }
  })
  moduleRegistry = { source, plugins: modulePlugins, widgets: moduleWidgets }
  return moduleRegistry
}

/** Toutes les extensions trouvées, valides ou non : intégrées, puis modules tiers. */
export function getPlugins(): readonly LoadedPlugin[] {
  return [...plugins, ...getModuleRegistry().plugins]
}

export function getWidget(key: string): RegisteredWidget | undefined {
  return widgets.get(key) ?? getModuleRegistry().widgets.get(key)
}

/**
 * Widgets de la barre des pages fournis par les extensions activées (ceux d'une extension
 * désactivée ou absente ne s'affichent pas, et reviennent avec elle).
 */
export function getHeaderWidget(
  key: string,
  disabledPlugins: readonly string[]
): RegisteredHeaderWidget | undefined {
  const widget = headerWidgets.get(key)
  return widget && !disabledPlugins.includes(widget.pluginId) ? widget : undefined
}

export function listHeaderWidgets(disabledPlugins: readonly string[]): RegisteredHeaderWidget[] {
  return [...headerWidgets.values()].filter((widget) => !disabledPlugins.includes(widget.pluginId))
}

/** Widgets proposés à l'ajout : ceux des extensions activées. */
export function listAvailableWidgets(disabledPlugins: readonly string[]): RegisteredWidget[] {
  return [...widgets.values(), ...getModuleRegistry().widgets.values()].filter(
    (widget) => !disabledPlugins.includes(widget.pluginId)
  )
}

/** Taille utilisée pour un widget dont l'extension est absente. */
const FALLBACK_SIZE: GridSizeSpec = { w: 6, h: 3 }
const FALLBACK_MIN_SIZE: GridSizeSpec = { w: 2, h: 1 }

export function getDefaultSize(key: string): GridSizeSpec {
  return getWidget(key)?.manifest.defaultSize ?? FALLBACK_SIZE
}

export function getMinSize(key: string): GridSizeSpec {
  return getWidget(key)?.manifest.minSize ?? FALLBACK_MIN_SIZE
}

/**
 * Textes des extensions dans i18next (un espace de noms par extension), ajoutés quand leur code
 * est chargé.
 */
export function registerPluginTranslations(i18n: I18n): void {
  translations = i18n
  for (const [pluginId, module] of waitingTranslations) addTranslations(pluginId, module)
  waitingTranslations.clear()
}
