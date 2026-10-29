import { definePlugin } from '@tessera/plugin-sdk'
import { MonitorWidget } from './MonitorWidget'
import { StatusButton } from './StatusButton'

export default definePlugin({
  widgets: {
    monitor: MonitorWidget
  },
  headerWidgets: {
    status: StatusButton
  },
  translations: {
    fr: {
      header: {
        name: 'État des sites',
        allUp: 'État des sites : tous en ligne',
        down: 'État des sites : {{count}} hors ligne',
        offline: 'Hors ligne',
        empty: 'Aucun site surveillé (ajoute-les dans le bloc Surveillance de sites).'
      },
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
      removeTitle: 'Ne plus surveiller ce site ?',
      removeMessage: 'Tessera ne vérifiera plus « {{name}} » et ne préviendra plus s’il tombe.',
      pending: 'Première vérification…',
      up: 'En ligne · {{ms}} ms',
      down: 'En panne · {{error}}',
      uptime: '{{value}} % sur 24 h',
      certificate: 'Certificat HTTPS valable encore {{count}} jours',
      days: '{{count}} j',
      checking: 'Vérification…'
    },
    en: {
      header: {
        name: 'Site status',
        allUp: 'Site status: all up',
        down: 'Site status: {{count}} down',
        offline: 'Down',
        empty: 'No monitored site (add them in the Site monitoring block).'
      },
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
      removeTitle: 'Stop watching this site?',
      removeMessage: 'Tessera will no longer check “{{name}}” or warn you when it goes down.',
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
