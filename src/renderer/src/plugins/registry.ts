import { createElement } from 'react'
import type { i18n as I18n } from 'i18next'
import type { InstalledModule } from '@shared/modules'
import {
  parseManifest,
  widgetKey,
  type GridSizeSpec,
  type PluginCategory,
  type PluginManifest,
  type WidgetManifest
} from '@shared/plugins'
import type { PluginModule, WidgetComponent } from '@tessera/plugin-sdk'
import type { PluginContextValue } from '../plugin-sdk/context'
import { ModuleFrame } from '../components/grid/ModuleFrame'
import { useModulesStore } from '../stores/modules'

/**
 * Registre des extensions.
 *
 * Les extensions intégrées vivent dans le dossier `plugins/` à la racine du projet : chaque
 * sous-dossier contenant un `manifest.json` et un `index.tsx` est découvert automatiquement
 * au build (aucune liste à tenir à jour).
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

/** Bloc « application web » (extension intégrée tessera.web), configuré par `{ url, appId }`. */
export const WEB_APP_WIDGET = 'tessera.web/web'

const manifestFiles = import.meta.glob<unknown>('../../../../plugins/*/manifest.json', {
  eager: true,
  import: 'default'
})
const codeFiles = import.meta.glob<PluginModule>('../../../../plugins/*/index.tsx', {
  eager: true,
  import: 'default'
})

const plugins: LoadedPlugin[] = []
const widgets = new Map<string, RegisteredWidget>()
const modules = new Map<string, PluginModule>()

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
  module: PluginModule | undefined
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
  if (modules.has(manifest.id)) return invalid(`Identifiant « ${manifest.id} » déjà utilisé.`)
  if (!module || typeof module.widgets !== 'object') {
    return invalid('index.tsx doit exporter par défaut definePlugin({ widgets: … }).')
  }
  const missing = manifest.widgets.find(
    (widget) => typeof module.widgets[widget.type] !== 'function'
  )
  if (missing) return invalid(`Aucun composant fourni pour le widget « ${missing.type} ».`)

  modules.set(manifest.id, module)
  const context: PluginContextValue = { id: manifest.id, permissions: manifest.permissions }
  for (const widget of manifest.widgets) {
    const key = widgetKey(manifest.id, widget.type)
    widgets.set(key, {
      key,
      pluginId: manifest.id,
      manifest: widget,
      component: module.widgets[widget.type],
      context,
      builtIn: true,
      category: manifest.category
    })
  }
  return { id: manifest.id, manifest, error: null, builtIn: true, module: null }
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

/** Rend les textes des extensions disponibles dans i18next (un espace de noms par extension). */
export function registerPluginTranslations(i18n: I18n): void {
  for (const [pluginId, module] of modules) {
    for (const [language, strings] of Object.entries(module.translations ?? {})) {
      i18n.addResourceBundle(language, pluginId, strings, true, true)
    }
  }
}
