import { definePlugin } from '@tessera/plugin-sdk'
import { TerminalWidget } from './TerminalWidget'

export default definePlugin({
  widgets: {
    terminal: TerminalWidget
  },
  translations: {
    fr: {
      newTab: 'Nouvel onglet',
      splitRight: 'Fractionner : nouvelle console à droite',
      splitDown: 'Fractionner : nouvelle console en dessous',
      closePane: 'Fermer cette console (et son programme)',
      closeTab: 'Fermer l’onglet (et son programme)',
      cwd: 'Dossier de départ : {{path}}',
      chooseCwd: 'Choisir le dossier de départ',
      home: 'dossier personnel',
      loading: 'Recherche des shells…',
      noTab: 'Aucun onglet ouvert.',
      noShell: 'Aucun shell trouvé sur ce PC.',
      openTab: 'Ouvrir un onglet {{shell}}',
      exited: 'Programme terminé : ferme l’onglet ou ouvres-en un autre.'
    },
    en: {
      newTab: 'New tab',
      splitRight: 'Split: new console on the right',
      splitDown: 'Split: new console below',
      closePane: 'Close this console (and its program)',
      closeTab: 'Close the tab (and its program)',
      cwd: 'Start folder: {{path}}',
      chooseCwd: 'Choose the start folder',
      home: 'home folder',
      loading: 'Looking for shells…',
      noTab: 'No tab open.',
      noShell: 'No shell found on this PC.',
      openTab: 'Open a {{shell}} tab',
      exited: 'Program ended: close the tab or open another one.'
    }
  }
})
