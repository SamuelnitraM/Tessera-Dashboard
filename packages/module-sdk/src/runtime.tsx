import {
  Component,
  createContext,
  StrictMode,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
  type RefObject
} from 'react'
import { createRoot } from 'react-dom/client'
import type { ModuleWidgetState } from '../../../src/shared/module-bridge'
import type { PluginPermission } from '../../../src/shared/plugins'
import type { Language } from '../../../src/shared/settings'
import { getBridge, type WidgetIdentity } from './bridge'
import { injectStyles } from './ui/styles'
import { createTranslator, type PluginTranslations, type TranslateFunction } from './translate'

/** Ce que reçoit le composant d'un widget (comme les widgets intégrés à Tessera). */
export interface WidgetProps<Config extends object = Record<string, unknown>> {
  /** Identifiant unique de ce bloc sur sa page. */
  instanceId: string
  /**
   * Configuration du bloc : les réglages déclarés dans le manifeste (valeurs par défaut
   * comprises), plus toute donnée enregistrée par le widget avec `setConfig`.
   */
  config: Config
  /** Modifie la configuration (fusionnée avec l'existante, puis sauvegardée par Tessera). */
  setConfig: (patch: Partial<Config>) => void
  /** La page est en mode édition (le bloc ne reçoit alors plus la souris). */
  editing: boolean
}

/** Composant de widget, quelle que soit la forme de sa configuration. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WidgetComponent = ComponentType<WidgetProps<any>>

/** Code d'un module, exporté par son point d'entrée (`src/index.tsx`). */
export interface PluginModule {
  /** Un composant par widget déclaré dans le manifeste, indexé par son `type`. */
  widgets: Record<string, WidgetComponent>
  translations?: PluginTranslations
}

const TranslationContext = createContext<TranslateFunction>((key) => key)

/**
 * Déclare le code du module, puis affiche le widget demandé par Tessera dans ce bloc.
 * Le point d'entrée du module doit l'appeler (`export default definePlugin({ … })`).
 */
export function definePlugin(plugin: PluginModule): PluginModule {
  void mount(plugin)
  return plugin
}

async function mount(plugin: PluginModule): Promise<void> {
  const bridge = getBridge()
  await bridge.ready
  injectStyles()
  const identity = bridge.identity as WidgetIdentity
  const widget = Object.hasOwn(plugin.widgets ?? {}, identity.widgetType)
    ? plugin.widgets[identity.widgetType]
    : undefined
  if (typeof widget !== 'function' && typeof widget !== 'object') {
    bridge.crash(`Aucun composant fourni pour le widget « ${identity.widgetType} ».`)
    return
  }

  applyDocumentState(bridge.state)
  bridge.subscribe(() => applyDocumentState(bridge.state))

  const element =
    document.getElementById('root') ?? document.body.appendChild(document.createElement('div'))
  createRoot(element).render(
    <StrictMode>
      <ErrorBoundary report={(message) => bridge.crash(message)}>
        <Root plugin={plugin} widget={widget} identity={identity} />
      </ErrorBoundary>
    </StrictMode>
  )
}

/** Thème (variables CSS de Tessera) et langue appliqués à la page du bloc. */
function applyDocumentState(state: ModuleWidgetState | null): void {
  if (!state) return
  const root = document.documentElement
  for (const [name, value] of Object.entries(state.theme)) {
    if (name.startsWith('--') && value) root.style.setProperty(name, value)
  }
  root.lang = state.language
  root.dataset.editing = String(state.editing)
}

function useWidgetState(): ModuleWidgetState {
  const bridge = getBridge()
  return useSyncExternalStore(bridge.subscribe, () => bridge.state as ModuleWidgetState)
}

function Root({
  plugin,
  widget: Widget,
  identity
}: {
  plugin: PluginModule
  widget: WidgetComponent
  identity: WidgetIdentity
}): ReactNode {
  const state = useWidgetState()
  const translate = useMemo(
    () => createTranslator(plugin.translations, state.language),
    [plugin.translations, state.language]
  )
  const setConfig = useMemo(
    () => (patch: Record<string, unknown>) => getBridge().setConfig(patch),
    []
  )
  return (
    <TranslationContext.Provider value={translate}>
      <Widget
        instanceId={identity.instanceId}
        config={state.config}
        setConfig={setConfig}
        editing={state.editing}
      />
    </TranslationContext.Provider>
  )
}

/** Une erreur dans le widget : Tessera affiche son écran d'erreur, avec « Réessayer ». */
class ErrorBoundary extends Component<
  { report: (message: string) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[module] Erreur dans le widget :', error, info.componentStack)
    this.props.report(error.message || String(error))
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Traduit les textes du module (déclarés dans `translations`).
 * Exemple : `const t = usePluginTranslation(); t('total', { value: 3 })`.
 */
export function usePluginTranslation(): TranslateFunction {
  return useContext(TranslationContext)
}

/** Langue de l'interface de Tessera (`fr` ou `en`), pour formater dates et nombres (`Intl`). */
export function useLanguage(): Language {
  return useWidgetState().language
}

/** Permissions accordées par l'utilisateur (il peut en retirer à tout moment). */
export function usePermissions(): readonly PluginPermission[] {
  return useWidgetState().permissions
}

/** Identité du bloc : module, type de widget et identifiant du bloc. */
export function useWidget(): WidgetIdentity {
  return getBridge().identity as WidgetIdentity
}

/**
 * Référence toujours à jour vers une valeur, lisible depuis des fonctions asynchrones,
 * des écouteurs ou un nettoyage d'effet, sans les recréer à chaque rendu.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

/** Taille du bloc en pixels, mise à jour quand l'utilisateur le redimensionne. */
export function useSize(): { width: number; height: number } {
  const read = (): { width: number; height: number } => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight
  })
  const [size, setSize] = useState(read)
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => setSize(read()))
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  }, [])
  return size
}
