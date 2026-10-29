import { definePlugin } from '@tessera/plugin-sdk'
import { BrowserWidget, DesktopWidget } from './DesktopWidget'

export default definePlugin({
  widgets: {
    app: DesktopWidget,
    browser: BrowserWidget
  },
  translations: {
    fr: {
      title: 'Quelle application afficher ?',
      browserTitle: 'Quel navigateur afficher ?',
      browserIntro:
        'La vraie fenêtre du navigateur s’affiche dans ce bloc, avec tes onglets, tes connexions et tes extensions. Ses vidéos en plein écran occupent tout l’écran.',
      noBrowser:
        'Aucun navigateur reconnu sur ce PC (Brave, Chrome, Edge, Firefox, Vivaldi, Opera).',
      intro:
        'La vraie fenêtre de l’application s’affiche dans ce bloc : elle garde sa connexion, ses messages et ses notifications.',
      add: 'Ajouter une application installée…',
      change: 'Changer d’application',
      switchBrowser: 'Navigateurs (celui qu’on quitte reste ouvert, caché)',
      switchTo: 'Passer à {{name}} (le navigateur actuel reste ouvert, caché)',
      refresh: 'Rafraîchir le bloc (fenêtre grise ou absente)',
      takeOut: 'Sortir la fenêtre de Tessera (sur le bureau)',
      cancel: 'Annuler',
      missing: 'Cette application a été supprimée de Tessera.'
    },
    en: {
      title: 'Which app should be shown?',
      browserTitle: 'Which browser should be shown?',
      browserIntro:
        'The browser’s real window is shown in this block, with your tabs, sign-ins and extensions. Its full-screen videos take the whole screen.',
      noBrowser: 'No recognized browser on this PC (Brave, Chrome, Edge, Firefox, Vivaldi, Opera).',
      intro:
        'The app’s real window is shown in this block: it keeps its sign-in, messages and notifications.',
      add: 'Add an installed app…',
      change: 'Change app',
      switchBrowser: 'Browsers (the one you leave stays open, hidden)',
      switchTo: 'Switch to {{name}} (the current browser stays open, hidden)',
      refresh: 'Refresh the block (grey or missing window)',
      takeOut: 'Take the window out of Tessera (to the desktop)',
      cancel: 'Cancel',
      missing: 'This app was removed from Tessera.'
    }
  }
})
