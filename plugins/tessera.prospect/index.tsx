import { definePlugin } from '@tessera/plugin-sdk'
import { ProspectWidget } from './ProspectWidget'

export default definePlugin({
  widgets: {
    prospect: ProspectWidget
  },
  translations: {
    fr: {
      view: 'Affichage',
      views: { dashboard: 'Tableau de bord', interface: 'Interface', logs: 'Journaux' },
      intro:
        'Choisis le fichier start.bat de Prospect Solution : le bloc démarre le serveur, suit ta prospection et affiche son interface.',
      pick: 'Choisir start.bat…',
      start: 'Démarrer',
      stop: 'Arrêter',
      serverOff: 'Le serveur de Prospect Solution est arrêté.',
      noOwnRun: 'Les journaux s’affichent quand le serveur est démarré depuis ce bloc.',
      noLogs: 'Les journaux du serveur s’afficheront ici.',
      copyLogs: 'Copier les journaux',
      clearLogs: 'Effacer les journaux',
      status: {
        loading: 'Recherche du serveur…',
        stopped: 'Arrêté',
        starting: 'Démarrage… (le premier lancement installe les dépendances)',
        ready: 'Prêt · 127.0.0.1:{{port}}',
        external: 'Lancé hors de Tessera · 127.0.0.1:{{port}}',
        otherService: 'Port {{port}} occupé par un autre programme',
        version: 'Version de l’API ({{version}}) non prévue : affichage possiblement incomplet',
        failed: 'Échec du démarrage',
        exitCode: 'Arrêté avec le code {{code}}'
      },
      kpi: {
        total: 'Prospects',
        followUps: 'Relances du jour',
        opportunities: 'Sans site ou chauds',
        withoutPhone: 'Sans téléphone'
      },
      pipeline: 'Suivi',
      statuses: {
        new: 'Nouveau',
        to_call: 'À appeler',
        called_no_answer: 'Pas de réponse',
        callback: 'À rappeler',
        interested: 'Intéressé',
        meeting: 'RDV fixé',
        quote_sent: 'Devis envoyé',
        won: 'Signé',
        lost: 'Perdu',
        not_interested: 'Pas intéressé'
      },
      jobs: 'Tâches',
      jobStatus: {
        running: 'En cours…',
        completed: 'Terminée',
        failed: 'Échec',
        cancelled: 'Annulée'
      },
      cancelJob: 'Annuler la tâche',
      followUps: 'Relances du jour',
      noFollowUps: 'Aucune relance aujourd’hui.',
      noPhone: 'pas de numéro',
      call: 'Appeler le {{phone}}',
      notify: {
        jobDone: 'Prospect Solution : tâche terminée',
        jobFailed: 'Prospect Solution : tâche en échec',
        followUpsTitle_one: '{{count}} relance aujourd’hui',
        followUpsTitle_other: '{{count}} relances aujourd’hui',
        followUpsBody: 'Prospect Solution : les prospects à rappeler t’attendent.'
      },
      errors: {
        permission: 'Cette extension n’a pas le droit de lancer ce programme.',
        'not-approved': 'Programme non autorisé : choisis start.bat de nouveau.',
        'not-found': 'start.bat est introuvable : choisis-le de nouveau.',
        invalid: 'Fichier non pris en charge.',
        'already-running': 'Le serveur est déjà démarré par ce bloc.',
        io: 'Le serveur n’a pas pu être démarré.',
        unavailable: 'Prospect Solution ne répond pas.',
        failed: 'L’opération a échoué.',
        alreadyRunning: 'Prospect Solution tourne déjà (lancé hors de Tessera).',
        portBusy: 'Le port {{port}} est occupé par un autre programme.'
      }
    },
    en: {
      view: 'View',
      views: { dashboard: 'Dashboard', interface: 'Interface', logs: 'Logs' },
      intro:
        'Choose the start.bat file of Prospect Solution: the block starts the server, follows your prospecting and shows its interface.',
      pick: 'Choose start.bat…',
      start: 'Start',
      stop: 'Stop',
      serverOff: 'The Prospect Solution server is stopped.',
      noOwnRun: 'Logs show up when the server is started from this block.',
      noLogs: 'The server logs will show up here.',
      copyLogs: 'Copy logs',
      clearLogs: 'Clear logs',
      status: {
        loading: 'Looking for the server…',
        stopped: 'Stopped',
        starting: 'Starting… (the first launch installs the dependencies)',
        ready: 'Ready · 127.0.0.1:{{port}}',
        external: 'Started outside Tessera · 127.0.0.1:{{port}}',
        otherService: 'Port {{port}} is used by another program',
        version: 'Unexpected API version ({{version}}): display may be incomplete',
        failed: 'Failed to start',
        exitCode: 'Stopped with code {{code}}'
      },
      kpi: {
        total: 'Prospects',
        followUps: 'Today’s follow-ups',
        opportunities: 'No website or hot',
        withoutPhone: 'No phone'
      },
      pipeline: 'Pipeline',
      statuses: {
        new: 'New',
        to_call: 'To call',
        called_no_answer: 'No answer',
        callback: 'Call back',
        interested: 'Interested',
        meeting: 'Meeting set',
        quote_sent: 'Quote sent',
        won: 'Won',
        lost: 'Lost',
        not_interested: 'Not interested'
      },
      jobs: 'Jobs',
      jobStatus: {
        running: 'Running…',
        completed: 'Done',
        failed: 'Failed',
        cancelled: 'Cancelled'
      },
      cancelJob: 'Cancel the job',
      followUps: 'Today’s follow-ups',
      noFollowUps: 'No follow-up today.',
      noPhone: 'no number',
      call: 'Call {{phone}}',
      notify: {
        jobDone: 'Prospect Solution: job done',
        jobFailed: 'Prospect Solution: job failed',
        followUpsTitle_one: '{{count}} follow-up today',
        followUpsTitle_other: '{{count}} follow-ups today',
        followUpsBody: 'Prospect Solution: prospects to call back are waiting.'
      },
      errors: {
        permission: 'This extension is not allowed to launch this program.',
        'not-approved': 'Program not allowed: choose start.bat again.',
        'not-found': 'start.bat not found: choose it again.',
        invalid: 'Unsupported file.',
        'already-running': 'The server is already started by this block.',
        io: 'The server could not be started.',
        unavailable: 'Prospect Solution does not answer.',
        failed: 'The operation failed.',
        alreadyRunning: 'Prospect Solution is already running (started outside Tessera).',
        portBusy: 'Port {{port}} is used by another program.'
      }
    }
  }
})
