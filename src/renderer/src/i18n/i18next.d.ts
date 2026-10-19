import 'i18next'
import type { Translation } from '@shared/i18n'

// Rend les clés de traduction typées : `t('settings.titre')` (faute de frappe) ne compile pas
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: Translation
    }
  }
}
