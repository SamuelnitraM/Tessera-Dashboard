import { definePlugin } from '@tessera/plugin-sdk'
import { GitSpreadWidget } from './GitSpreadWidget'

export default definePlugin({
  widgets: {
    gitspread: GitSpreadWidget
  },
  translations: {
    fr: {
      view: 'Affichage',
      views: { projects: 'Projets', app: 'GitSpread' },
      refresh: 'Actualiser',
      openApp: 'Ouvrir GitSpread',
      pickExecutable: 'Choisir GitSpread.exe…',
      takeOut: 'Sortir la fenêtre de Tessera',
      status: {
        loading: 'Lecture…',
        notInstalled: 'Paramètres de GitSpread introuvables',
        open_one: 'Ouvert · {{count}} projet',
        open_other: 'Ouvert · {{count}} projets',
        closed_one: 'Fermé · {{count}} projet',
        closed_other: 'Fermé · {{count}} projets'
      },
      search: 'Rechercher un projet ou un compte',
      missingRoots_one: '{{count}} dossier de GitSpread n’existe plus',
      missingRoots_other: '{{count}} dossiers de GitSpread n’existent plus',
      noProjects: 'Aucun projet trouvé dans les dossiers de GitSpread.',
      nothingPending: 'Rien à faire : tout est à jour.',
      unlinked: 'Non liés / autres',
      notRepository: 'pas encore suivi par git',
      detached: 'HEAD détachée',
      fetched: 'récupéré {{when}}',
      openFolder: 'Ouvrir le dossier',
      openWeb: 'Ouvrir sur GitHub',
      badges: {
        error: 'Erreur',
        conflicts: 'Fichiers en conflit',
        ahead_one: '{{count}} commit à pousser',
        ahead_other: '{{count}} commits à pousser',
        behind_one: '{{count}} commit en retard (dernière récupération)',
        behind_other: '{{count}} commits en retard (dernière récupération)',
        changes_one: '{{count}} fichier modifié',
        changes_other: '{{count}} fichiers modifiés',
        untracked_one: '{{count}} fichier non suivi',
        untracked_other: '{{count}} fichiers non suivis',
        clean: 'À jour',
        local: 'local',
        noUpstream: 'Branche pas encore publiée'
      },
      appIntro:
        'Affiche la vraie fenêtre de GitSpread dans ce bloc. Ajoute-la d’abord aux applications de Tessera (programme du menu Démarrer ou GitSpread.exe).',
      addApp: 'Ajouter GitSpread…',
      errors: {
        permission: 'Cette extension n’a pas accès à GitSpread.',
        unavailable: 'GitSpread ne répond pas.',
        'not-found': 'GitSpread.exe est introuvable : choisis-le en mode édition.',
        invalid: 'Demande refusée : actualise la liste.',
        failed: 'L’opération a échoué.'
      }
    },
    en: {
      view: 'View',
      views: { projects: 'Projects', app: 'GitSpread' },
      refresh: 'Refresh',
      openApp: 'Open GitSpread',
      pickExecutable: 'Choose GitSpread.exe…',
      takeOut: 'Take the window out of Tessera',
      status: {
        loading: 'Reading…',
        notInstalled: 'GitSpread settings not found',
        open_one: 'Open · {{count}} project',
        open_other: 'Open · {{count}} projects',
        closed_one: 'Closed · {{count}} project',
        closed_other: 'Closed · {{count}} projects'
      },
      search: 'Search a project or an account',
      missingRoots_one: '{{count}} GitSpread folder no longer exists',
      missingRoots_other: '{{count}} GitSpread folders no longer exist',
      noProjects: 'No project found in the GitSpread folders.',
      nothingPending: 'Nothing to do: everything is up to date.',
      unlinked: 'Unlinked / others',
      notRepository: 'not tracked by git yet',
      detached: 'detached HEAD',
      fetched: 'fetched {{when}}',
      openFolder: 'Open the folder',
      openWeb: 'Open on GitHub',
      badges: {
        error: 'Error',
        conflicts: 'Conflicting files',
        ahead_one: '{{count}} commit to push',
        ahead_other: '{{count}} commits to push',
        behind_one: '{{count}} commit behind (last fetch)',
        behind_other: '{{count}} commits behind (last fetch)',
        changes_one: '{{count}} changed file',
        changes_other: '{{count}} changed files',
        untracked_one: '{{count}} untracked file',
        untracked_other: '{{count}} untracked files',
        clean: 'Up to date',
        local: 'local',
        noUpstream: 'Branch not published yet'
      },
      appIntro:
        'Shows the real GitSpread window in this block. First add it to Tessera’s applications (Start menu program or GitSpread.exe).',
      addApp: 'Add GitSpread…',
      errors: {
        permission: 'This extension has no access to GitSpread.',
        unavailable: 'GitSpread does not answer.',
        'not-found': 'GitSpread.exe not found: choose it in edit mode.',
        invalid: 'Request refused: refresh the list.',
        failed: 'The operation failed.'
      }
    }
  }
})
