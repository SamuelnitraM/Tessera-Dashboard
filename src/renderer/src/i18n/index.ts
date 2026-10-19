import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { translations } from '@shared/i18n'
import type { Language } from '@shared/settings'

/** Initialise i18next avec les traductions partagées (les mêmes que le processus principal). */
export async function initI18n(language: Language): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources: {
      fr: { translation: translations.fr },
      en: { translation: translations.en }
    },
    lng: language,
    fallbackLng: 'fr',
    // React échappe déjà le HTML : inutile de le faire deux fois
    interpolation: { escapeValue: false }
  })
  document.documentElement.lang = language
}

export async function changeLanguage(language: Language): Promise<void> {
  if (i18n.language === language) return
  await i18n.changeLanguage(language)
  document.documentElement.lang = language
}
