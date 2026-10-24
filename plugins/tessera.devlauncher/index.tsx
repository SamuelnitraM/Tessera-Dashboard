import { definePlugin } from '@tessera/plugin-sdk'
import { DevLauncherWidget } from './DevLauncherWidget'

export default definePlugin({
  widgets: {
    devlauncher: DevLauncherWidget
  },
  translations: {
    fr: {
      view: 'Affichage',
      views: { projects: 'Projets', services: 'Services', logs: 'Journaux' },
      open: 'Ouvrir',
      stopAll: 'Tout arrêter',
      pickExecutable: 'Choisir DevLauncher.exe…',
      launching: 'Lancement de {{project}}…',
      launched: '{{project}} lancé.',
      notInstalled:
        'DevLauncher n’a pas encore été utilisé sur ce PC (dossier %APPDATA%\\DevLauncher introuvable).',
      status: {
        loading: 'Lecture…',
        notInstalled: 'Introuvable sur ce PC',
        connected: 'Connecté (port {{port}})',
        otherService: 'Port {{port}} occupé par un autre programme',
        unauthorized: 'Jeton du serveur MCP refusé',
        closed: 'Fermé',
        openNoMcp: 'Ouvert · pilotage désactivé',
        openOffline: 'Ouvert · serveur MCP injoignable'
      },
      help: {
        disabled:
          'Lecture seule : pour lancer tes projets depuis Tessera, active le serveur MCP de DevLauncher.',
        step1: 'Dans DevLauncher, ouvre ⚙️ Paramètres, partie « 🧩 Serveur MCP ».',
        step2:
          'Coche « Activer le serveur MCP local » et choisis un port libre (8765 est celui de Prospect Solution).',
        step3: 'Enregistre : Tessera lit le port et le jeton dans les paramètres de DevLauncher.',
        offline:
          'Le serveur MCP est activé mais ne répond pas : ouvre DevLauncher pour lancer tes projets d’ici.',
        otherService:
          'Un autre programme répond sur le port {{port}} : choisis un autre port pour le serveur MCP dans les paramètres de DevLauncher.',
        unauthorized:
          'DevLauncher refuse le jeton enregistré dans ses paramètres : redémarre DevLauncher après avoir enregistré ses paramètres.'
      },
      search: 'Rechercher un projet',
      noProjects: 'Aucun projet.',
      groups: { favorites: 'Favoris', recents: 'Récemment lancés', all: 'Tous les projets' },
      launchCount_one: '{{count}} lancement',
      launchCount_other: '{{count}} lancements',
      lastLaunch: 'dernier le {{date}}',
      profile: 'Profil',
      launchProject: 'Lancer {{project}}',
      needsMcp: 'Active le serveur MCP de DevLauncher pour lancer depuis Tessera',
      noServices: 'Aucun service lancé par DevLauncher.',
      restart: 'Redémarrer {{name}}',
      serviceState: { ready: 'prêt', starting: 'démarrage…', stopped: 'arrêté' },
      logSource: 'Journal affiché',
      launchLog: 'Journal de lancement',
      launchLogFile: 'Journal de lancement (fichier de DevLauncher)',
      copyLogs: 'Copier le journal',
      noLogs: 'Le journal est vide.',
      logsUnavailable: 'Journal indisponible.',
      notify: {
        readyTitle: 'Environnement prêt',
        readyBody: '{{project}} est lancé et ses services répondent.',
        stoppedTitle: '{{name}} s’est arrêté',
        stoppedBody: 'Service du projet {{project}}.'
      },
      errors: {
        permission: 'Cette extension n’a pas accès à DevLauncher.',
        unavailable: 'DevLauncher ne répond pas.',
        'not-found': 'DevLauncher.exe est introuvable : choisis-le.',
        invalid: 'Demande refusée.',
        failed: 'DevLauncher a renvoyé une erreur.'
      }
    },
    en: {
      view: 'View',
      views: { projects: 'Projects', services: 'Services', logs: 'Logs' },
      open: 'Open',
      stopAll: 'Stop all',
      pickExecutable: 'Choose DevLauncher.exe…',
      launching: 'Launching {{project}}…',
      launched: '{{project}} launched.',
      notInstalled:
        'DevLauncher has not been used on this PC yet (%APPDATA%\\DevLauncher folder not found).',
      status: {
        loading: 'Reading…',
        notInstalled: 'Not found on this PC',
        connected: 'Connected (port {{port}})',
        otherService: 'Port {{port}} is used by another program',
        unauthorized: 'MCP server token refused',
        closed: 'Closed',
        openNoMcp: 'Open · control disabled',
        openOffline: 'Open · MCP server unreachable'
      },
      help: {
        disabled:
          'Read only: to launch your projects from Tessera, enable the DevLauncher MCP server.',
        step1: 'In DevLauncher, open ⚙️ Settings, “🧩 MCP server” section.',
        step2:
          'Tick “Enable the local MCP server” and choose a free port (8765 is used by Prospect Solution).',
        step3: 'Save: Tessera reads the port and token from DevLauncher’s settings.',
        offline:
          'The MCP server is enabled but does not answer: open DevLauncher to launch your projects from here.',
        otherService:
          'Another program answers on port {{port}}: choose another port for the MCP server in DevLauncher’s settings.',
        unauthorized:
          'DevLauncher refuses the token saved in its settings: restart DevLauncher after saving its settings.'
      },
      search: 'Search a project',
      noProjects: 'No projects.',
      groups: { favorites: 'Favorites', recents: 'Recently launched', all: 'All projects' },
      launchCount_one: '{{count}} launch',
      launchCount_other: '{{count}} launches',
      lastLaunch: 'last on {{date}}',
      profile: 'Profile',
      launchProject: 'Launch {{project}}',
      needsMcp: 'Enable the DevLauncher MCP server to launch from Tessera',
      noServices: 'No service launched by DevLauncher.',
      restart: 'Restart {{name}}',
      serviceState: { ready: 'ready', starting: 'starting…', stopped: 'stopped' },
      logSource: 'Displayed log',
      launchLog: 'Launch log',
      launchLogFile: 'Launch log (DevLauncher file)',
      copyLogs: 'Copy the log',
      noLogs: 'The log is empty.',
      logsUnavailable: 'Log unavailable.',
      notify: {
        readyTitle: 'Environment ready',
        readyBody: '{{project}} is launched and its services answer.',
        stoppedTitle: '{{name}} stopped',
        stoppedBody: 'Service of the {{project}} project.'
      },
      errors: {
        permission: 'This extension has no access to DevLauncher.',
        unavailable: 'DevLauncher does not answer.',
        'not-found': 'DevLauncher.exe not found: choose it.',
        invalid: 'Request refused.',
        failed: 'DevLauncher returned an error.'
      }
    }
  }
})
