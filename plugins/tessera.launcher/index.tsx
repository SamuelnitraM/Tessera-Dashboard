import { definePlugin } from '@tessera/plugin-sdk'
import { LauncherWidget } from './LauncherWidget'

export default definePlugin({
  widgets: {
    launcher: LauncherWidget
  },
  translations: {
    fr: {
      empty: 'Aucun programme choisi',
      pick: 'Choisir un programme…',
      change: 'Changer de programme',
      start: 'Lancer',
      stop: 'Arrêter',
      restart: 'Relancer',
      showInFolder: 'Afficher dans l’Explorateur',
      copyLogs: 'Copier les journaux',
      clearLogs: 'Effacer les journaux',
      noLogs: 'Les journaux du programme s’afficheront ici.',
      windowMode: 'Le programme s’ouvre dans sa propre fenêtre.',
      status: {
        ready: 'Prêt',
        running: 'En cours depuis {{time}}',
        external: 'Déjà ouvert (hors de Tessera)',
        stopped: 'Arrêté',
        finished: 'Terminé',
        exitCode: 'Terminé avec le code {{code}}',
        failed: 'Échec du lancement : {{error}}',
        untracked: 'Ouvert par Windows'
      },
      errors: {
        permission: 'Cette extension n’a pas le droit de lancer des programmes.',
        'not-approved': 'Programme non autorisé : choisis-le de nouveau.',
        'not-found': 'Programme ou dossier de travail introuvable.',
        invalid: 'Type de fichier non pris en charge.',
        'already-running': 'Ce programme est déjà lancé.',
        io: 'Le programme n’a pas pu être lancé.'
      }
    },
    en: {
      empty: 'No program chosen',
      pick: 'Choose a program…',
      change: 'Change program',
      start: 'Start',
      stop: 'Stop',
      restart: 'Restart',
      showInFolder: 'Show in File Explorer',
      copyLogs: 'Copy logs',
      clearLogs: 'Clear logs',
      noLogs: 'The program’s logs will show up here.',
      windowMode: 'The program opens in its own window.',
      status: {
        ready: 'Ready',
        running: 'Running since {{time}}',
        external: 'Already open (outside Tessera)',
        stopped: 'Stopped',
        finished: 'Finished',
        exitCode: 'Finished with code {{code}}',
        failed: 'Failed to start: {{error}}',
        untracked: 'Opened by Windows'
      },
      errors: {
        permission: 'This extension is not allowed to launch programs.',
        'not-approved': 'Program not allowed: choose it again.',
        'not-found': 'Program or working folder not found.',
        invalid: 'Unsupported file type.',
        'already-running': 'This program is already running.',
        io: 'The program could not be started.'
      }
    }
  }
})
