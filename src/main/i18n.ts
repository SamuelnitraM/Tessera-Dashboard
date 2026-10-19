import { app } from 'electron'
import { translations, type Translation } from '@shared/i18n'
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
