import { definePlugin } from '@tessera/plugin-sdk'
import { ServicesWidget } from './ServicesWidget'

export default definePlugin({
  widgets: {
    services: ServicesWidget
  },
  translations: {
    fr: {
      search: 'Port, programme, projet…',
      showSystem: 'Services Windows',
      refresh: 'Actualiser',
      close: 'Fermer',
      loading: 'Recherche des ports en écoute…',
      noServices: 'Aucun programme n’écoute sur un port (hors services Windows).',
      port: 'Port',
      program: 'Programme',
      project: 'Projet',
      localOnly: 'ce PC seulement',
      network: 'réseau',
      open: 'Ouvrir http://localhost:{{port}}',
      stop: 'Arrêter le programme',
      stopTitle: 'Arrêter {{name}} (port {{port}}) ?',
      stopMessage:
        'Le programme est arrêté tout de suite, sans enregistrer : à réserver à un serveur bloqué ou oublié.',
      cancel: 'Annuler',
      dockerError: 'Docker ne répond pas ({{error}}). Docker Desktop est-il lancé ?',
      noContainers: 'Aucun conteneur.',
      start: 'Démarrer',
      restart: 'Redémarrer',
      stopContainer: 'Arrêter le conteneur'
    },
    en: {
      search: 'Port, program, project…',
      showSystem: 'Windows services',
      refresh: 'Refresh',
      close: 'Close',
      loading: 'Looking for listening ports…',
      noServices: 'No program is listening on a port (Windows services excluded).',
      port: 'Port',
      program: 'Program',
      project: 'Project',
      localOnly: 'this PC only',
      network: 'network',
      open: 'Open http://localhost:{{port}}',
      stop: 'Stop the program',
      stopTitle: 'Stop {{name}} (port {{port}})?',
      stopMessage:
        'The program is stopped immediately, without saving: meant for a stuck or forgotten server.',
      cancel: 'Cancel',
      dockerError: 'Docker isn’t responding ({{error}}). Is Docker Desktop running?',
      noContainers: 'No containers.',
      start: 'Start',
      restart: 'Restart',
      stopContainer: 'Stop the container'
    }
  }
})
