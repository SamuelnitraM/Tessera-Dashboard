import { definePlugin } from '@tessera/plugin-sdk'
import { WebWidget } from './WebWidget'

export default definePlugin({
  widgets: {
    web: WebWidget
  },
  translations: {
    fr: {
      title: 'Quel site afficher ?',
      address: 'Adresse du site',
      addressPlaceholder: 'ex. www.meteo.fr',
      show: 'Afficher',
      invalid: 'Adresse web invalide.',
      orApp: 'Ou une de tes applications (même connexion que son onglet) :',
      noApps: 'Ajoute des applications dans Paramètres → Applications pour les retrouver ici.',
      back: 'Précédent',
      reload: 'Actualiser',
      home: 'Revenir à la page de départ',
      openInBrowser: 'Ouvrir dans le navigateur',
      change: 'Changer de site',
      loadError: 'Page indisponible : {{error}}'
    },
    en: {
      title: 'Which site should be shown?',
      address: 'Site address',
      addressPlaceholder: 'e.g. www.weather.com',
      show: 'Show',
      invalid: 'Invalid web address.',
      orApp: 'Or one of your apps (same sign-in as its tab):',
      noApps: 'Add apps in Settings → Apps to find them here.',
      back: 'Back',
      reload: 'Reload',
      home: 'Back to the start page',
      openInBrowser: 'Open in browser',
      change: 'Change site',
      loadError: 'Page unavailable: {{error}}'
    }
  }
})
