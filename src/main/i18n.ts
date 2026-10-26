import { app } from 'electron'
import { interpolate, translations, type Translation } from '@shared/i18n'
import { resolveLanguage, type Language } from '@shared/settings'
import { getSettings } from './settings-store'

/** Langue effective du processus principal (menus natifs, zone de notification…). */
export function getLanguage(): Language {
  return resolveLanguage(getSettings().general.language, app.getPreferredSystemLanguages())
}

/** Textes traduits dans la langue courante. */
export function getTranslation(): Translation {
  return translations[getLanguage()]
}

type ErrorTexts = Translation['errors']

/**
 * Message d'erreur montré à l'utilisateur (section `errors`), dans la langue courante et
 * `{{variables}}` remplacées. Lu au moment de l'erreur : la langue peut avoir changé.
 */
export function errorText<G extends keyof ErrorTexts>(
  group: G,
  key: keyof ErrorTexts[G],
  values: Record<string, string> = {}
): string {
  return interpolate(String(getTranslation().errors[group][key]), values)
}
