/**
 * SDK des extensions Tessera Dashboard — importé par les extensions via `@tessera/plugin-sdk`.
 *
 * C'est le seul module qu'une extension doit importer depuis l'app : tout ce qui n'est pas
 * exporté ici est interne et peut changer sans prévenir.
 */
import { useContext, useMemo, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
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

/** Langue actuelle de l'interface, pour formater dates et nombres (`Intl`). */
export function useLanguage(): Language {
  const { i18n } = useTranslation()
  return i18n.language === 'en' ? 'en' : 'fr'
}

type TranslateFunction = (key: string, values?: Record<string, unknown>) => string

/**
 * Traduit les textes de l'extension (déclarés dans `translations`).
 * Exemple : `const t = usePluginTranslation(); t('placeholder')`.
 */
export function usePluginTranslation(): TranslateFunction {
  const pluginId = useContext(PluginContext)
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
