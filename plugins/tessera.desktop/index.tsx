import { definePlugin } from '@tessera/plugin-sdk'
import { DesktopWidget } from './DesktopWidget'

export default definePlugin({
  widgets: {
    app: DesktopWidget
  },
  translations: {
    fr: {
      title: 'Quelle application afficher ?',
      intro:
        'La vraie fenêtre de l’application s’affiche dans ce bloc : elle garde sa connexion, ses messages et ses notifications.',
      add: 'Ajouter une application installée…',
      change: 'Changer d’application',
      cancel: 'Annuler',
      missing: 'Cette application a été supprimée de Tessera.'
    },
    en: {
      title: 'Which app should be shown?',
      intro:
        'The app’s real window is shown in this block: it keeps its sign-in, messages and notifications.',
      add: 'Add an installed app…',
      change: 'Change app',
      cancel: 'Cancel',
      missing: 'This app was removed from Tessera.'
    }
  }
})
