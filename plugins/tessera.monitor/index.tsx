import { definePlugin } from '@tessera/plugin-sdk'
import { MonitorWidget } from './MonitorWidget'

export default definePlugin({
  widgets: {
    monitor: MonitorWidget
  },
  translations: {
    fr: {
      title: 'Sites surveillés',
      add: 'Surveiller un site',
      url: 'Adresse (ex. monsite.fr ou https://api.monsite.fr/sante)',
      name: 'Nom (facultatif)',
      interval: 'Vérification',
      every: 'toutes les {{count}} min',
      keyword: 'Texte attendu dans la page (facultatif)',
      save: 'Enregistrer',
      watch: 'Surveiller',
      cancel: 'Annuler',
      loading: 'Chargement…',
      empty: 'Ajoute un site : Tessera le vérifie régulièrement et te prévient s’il tombe.',
      open: 'Ouvrir le site',
      checkNow: 'Vérifier maintenant',
      edit: 'Modifier',
      remove: 'Ne plus surveiller',
      pending: 'Première vérification…',
      up: 'En ligne · {{ms}} ms',
      down: 'En panne · {{error}}',
      uptime: '{{value}} % sur 24 h',
      certificate: 'Certificat HTTPS valable encore {{count}} jours',
      days: '{{count}} j',
      checking: 'Vérification…'
    },
    en: {
      title: 'Watched sites',
      add: 'Watch a site',
      url: 'Address (e.g. mysite.com or https://api.mysite.com/health)',
      name: 'Name (optional)',
      interval: 'Check',
      every: 'every {{count}} min',
      keyword: 'Text expected in the page (optional)',
      save: 'Save',
      watch: 'Watch',
      cancel: 'Cancel',
      loading: 'Loading…',
      empty: 'Add a site: Tessera checks it regularly and warns you when it goes down.',
      open: 'Open the site',
      checkNow: 'Check now',
      edit: 'Edit',
      remove: 'Stop watching',
      pending: 'First check…',
      up: 'Up · {{ms}} ms',
      down: 'Down · {{error}}',
      uptime: '{{value}}% over 24 h',
      certificate: 'HTTPS certificate valid for {{count}} more days',
      days: '{{count}} d',
      checking: 'Checking…'
    }
  }
})
