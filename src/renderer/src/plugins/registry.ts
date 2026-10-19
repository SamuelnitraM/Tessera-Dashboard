import type { i18n as I18n } from 'i18next'
import {
  parseManifest,
  widgetKey,
  type GridSizeSpec,
  type PluginManifest,
  type WidgetManifest
} from '@shared/plugins'
import type { PluginModule, WidgetComponent } from '@tessera/plugin-sdk'

/**
 * Registre des extensions.
 *
 * Les extensions intégrées vivent dans le dossier `plugins/` à la racine du projet : chaque
 * sous-dossier contenant un `manifest.json` et un `index.tsx` est découvert automatiquement
 * au build (aucune liste à tenir à jour).
 */

export interface LoadedPlugin {
  /** Identifiant du manifeste, ou nom du dossier si le manifeste est invalide. */
  id: string
  manifest: PluginManifest | null
  /** Message d'erreur si l'extension n'a pas pu être chargée. */
  error: string | null
  /** Fournie avec l'app (les extensions tierces arriveront à l'étape 12). */
  builtIn: boolean
}

export interface RegisteredWidget {
  /** Clé complète, enregistrée dans dashboard.json : `<extension>/<widget>`. */
  key: string
  pluginId: string
  manifest: WidgetManifest
  component: WidgetComponent
}

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
    builtIn: true
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
  for (const widget of manifest.widgets) {
    const key = widgetKey(manifest.id, widget.type)
    widgets.set(key, {
      key,
      pluginId: manifest.id,
      manifest: widget,
      component: module.widgets[widget.type]
    })
  }
  return { id: manifest.id, manifest, error: null, builtIn: true }
}

/** Toutes les extensions trouvées, valides ou non. */
export function getPlugins(): readonly LoadedPlugin[] {
  return plugins
}

export function getWidget(key: string): RegisteredWidget | undefined {
  return widgets.get(key)
}

/** Widgets proposés à l'ajout : ceux des extensions activées. */
export function listAvailableWidgets(disabledPlugins: readonly string[]): RegisteredWidget[] {
  return [...widgets.values()].filter((widget) => !disabledPlugins.includes(widget.pluginId))
}

/** Taille utilisée pour un widget dont l'extension est absente. */
const FALLBACK_SIZE: GridSizeSpec = { w: 6, h: 3 }
const FALLBACK_MIN_SIZE: GridSizeSpec = { w: 2, h: 1 }

export function getDefaultSize(key: string): GridSizeSpec {
  return widgets.get(key)?.manifest.defaultSize ?? FALLBACK_SIZE
}

export function getMinSize(key: string): GridSizeSpec {
  return widgets.get(key)?.manifest.minSize ?? FALLBACK_MIN_SIZE
}

/** Rend les textes des extensions disponibles dans i18next (un espace de noms par extension). */
export function registerPluginTranslations(i18n: I18n): void {
  for (const [pluginId, module] of modules) {
    for (const [language, strings] of Object.entries(module.translations ?? {})) {
      i18n.addResourceBundle(language, pluginId, strings, true, true)
    }
  }
}
