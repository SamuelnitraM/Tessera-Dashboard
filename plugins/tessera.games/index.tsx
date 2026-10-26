import { definePlugin } from '@tessera/plugin-sdk'
import { GamesWidget } from './GamesWidget'

export default definePlugin({
  widgets: {
    library: GamesWidget
  },
  translations: {
    fr: {
      capture: 'Dans le bloc',
      captureHint:
        'Afficher la fenêtre du jeu dans ce bloc (jeu en fenêtre ou en plein écran fenêtré)',
      release: 'Rendre la fenêtre du jeu au bureau',
      library: 'Retour à la bibliothèque (le jeu continue sur le bureau)',
      noWindow: 'Le jeu n’a pas encore de fenêtre à afficher (ou il est en plein écran exclusif).',
      'tab.recent': 'Récents',
      'tab.all': 'Tous',
      launcher: 'Lanceur',
      allLaunchers: 'Tous les lanceurs',
      search: 'Rechercher un jeu…',
      refresh: 'Actualiser la bibliothèque',
      running: 'Jeux en cours',
      runningBadge: 'En cours',
      launching: 'Lancement…',
      mute: 'Couper le son du jeu',
      unmute: 'Rétablir le son du jeu',
      volume: 'Volume de {{name}}',
      noAudio: 'Pas encore de son',
      loading: 'Chargement de la bibliothèque…',
      noGames: 'Aucun jeu Steam ou Epic Games installé sur ce PC.',
      noRecent: 'Aucun jeu lancé récemment : regarde l’onglet « Tous ».',
      noResults: 'Aucun jeu trouvé.',
      launch: 'Lancer {{name}} (hors de Tessera)',
      launchShort: 'Lancer',
      openFolder: 'Ouvrir le dossier du jeu',
      minutes: '{{count}} min',
      hours: '{{count}} h',
      outside:
        'Les jeux se lancent hors de Tessera, par Steam ou Epic Games. Le volume règle le son du jeu lui-même.'
    },
    en: {
      capture: 'In the block',
      captureHint: 'Show the game window in this block (windowed or borderless game)',
      release: 'Give the game window back to the desktop',
      library: 'Back to the library (the game keeps running on the desktop)',
      noWindow: 'The game has no window to show yet (or it is in exclusive full screen).',
      'tab.recent': 'Recent',
      'tab.all': 'All',
      launcher: 'Launcher',
      allLaunchers: 'All launchers',
      search: 'Search for a game…',
      refresh: 'Refresh the library',
      running: 'Running games',
      runningBadge: 'Running',
      launching: 'Launching…',
      mute: 'Mute the game',
      unmute: 'Unmute the game',
      volume: '{{name}} volume',
      noAudio: 'No sound yet',
      loading: 'Loading the library…',
      noGames: 'No Steam or Epic Games game installed on this PC.',
      noRecent: 'No game played recently: see the “All” tab.',
      noResults: 'No game found.',
      launch: 'Launch {{name}} (outside Tessera)',
      launchShort: 'Launch',
      openFolder: 'Open the game folder',
      minutes: '{{count}} min',
      hours: '{{count}} h',
      outside:
        'Games launch outside Tessera, through Steam or Epic Games. The volume controls the game’s own sound.'
    }
  }
})
