import { definePlugin } from '@tessera/plugin-sdk'
import { SpotifyWidget } from './SpotifyWidget'
import { PlayingButton } from './PlayingButton'

export default definePlugin({
  widgets: {
    spotify: SpotifyWidget
  },
  headerWidgets: {
    playing: PlayingButton
  },
  translations: {
    fr: {
      'view.label': 'Contenu du bloc',
      'view.app': 'Application',
      'view.appTitle': 'L’application Spotify de ce PC, dans le bloc (compte gratuit compris)',
      'view.player': 'Lecteur',
      'view.playerTitle':
        'Le lecteur de Tessera : lecture en cours, et avec un compte playlists, titres likés et recherche',
      'app.opening': 'Ouverture de Spotify…',
      'app.refresh': 'Rafraîchir le bloc (fenêtre grise ou absente)',
      'app.takeOut': 'Sortir Spotify de Tessera (sur le bureau)',
      'app.missingTitle': 'Spotify n’est pas installé sur ce PC',
      'app.missingText':
        'Installe l’application Spotify (depuis son site ou le Microsoft Store, compte gratuit accepté) : sa vraie fenêtre s’affichera dans ce bloc.',
      'app.download': 'Télécharger Spotify',
      'app.retry': 'Réessayer',
      'app.usePlayer': 'Utiliser le lecteur de Tessera',
      'header.name': 'Spotify',
      'header.label': 'Spotify · {{title}} – {{artist}}',
      'header.nothing': 'Rien en cours de lecture dans l’application Spotify.',
      'free.title': 'Sans compte',
      'free.search': 'Rechercher dans l’application Spotify',
      'free.searchButton': 'Rechercher',
      'header.open': 'Ouvrir dans Spotify',
      'header.play': 'Lecture',
      'header.pause': 'Pause',
      'header.next': 'Titre suivant',
      'header.previous': 'Titre précédent',
      'header.volume': 'Volume de Spotify',
      'header.mute': 'Couper le son de Spotify',
      'header.unmute': 'Rétablir le son de Spotify',
      loading: 'Chargement…',
      'tab.playlists': 'Playlists',
      'tab.liked': 'Titres likés',
      'tab.recent': 'Récents',
      'tab.search': 'Recherche',
      disconnect: 'Déconnecter Spotify',
      freeHint:
        'Playlists, titres likés et recherche passent par l’API de Spotify, qu’il réserve aux applications dont le propriétaire a un abonnement Premium. Sans compte, la lecture en cours de l’application Spotify et ses commandes marchent quand même.',
      search: 'Titre, artiste, album, playlist…',
      searchHint: 'Tape une recherche puis Entrée.',
      back: 'Retour aux playlists',
      playAll: 'Lire dans Spotify',
      playItem: 'Lire « {{name}} » dans Spotify',
      retry: 'Réessayer',
      nothing: 'Rien ici pour le moment.',
      openPlaylist: 'Voir les titres',
      openInSpotify: 'Ouvrir dans Spotify',
      'kind.album': 'Album',
      'kind.artist': 'Artiste',
      'kind.playlist': 'Playlist'
    },
    en: {
      'view.label': 'Block content',
      'view.app': 'App',
      'view.appTitle': 'The Spotify app of this PC, in the block (free account works)',
      'view.player': 'Player',
      'view.playerTitle':
        'Tessera’s player: what’s playing, and with an account playlists, liked songs and search',
      'app.opening': 'Opening Spotify…',
      'app.refresh': 'Refresh the block (grey or missing window)',
      'app.takeOut': 'Take Spotify out of Tessera (to the desktop)',
      'app.missingTitle': 'Spotify isn’t installed on this PC',
      'app.missingText':
        'Install the Spotify app (from its website or the Microsoft Store, free account works): its real window will be shown in this block.',
      'app.download': 'Download Spotify',
      'app.retry': 'Try again',
      'app.usePlayer': 'Use Tessera’s player',
      'header.name': 'Spotify',
      'header.label': 'Spotify · {{title}} – {{artist}}',
      'header.nothing': 'Nothing playing in the Spotify app.',
      'free.title': 'Without an account',
      'free.search': 'Search in the Spotify app',
      'free.searchButton': 'Search',
      'header.open': 'Open in Spotify',
      'header.play': 'Play',
      'header.pause': 'Pause',
      'header.next': 'Next track',
      'header.previous': 'Previous track',
      'header.volume': 'Spotify volume',
      'header.mute': 'Mute Spotify',
      'header.unmute': 'Unmute Spotify',
      loading: 'Loading…',
      'tab.playlists': 'Playlists',
      'tab.liked': 'Liked songs',
      'tab.recent': 'Recent',
      'tab.search': 'Search',
      disconnect: 'Disconnect Spotify',
      freeHint:
        'Playlists, liked songs and search go through Spotify’s API, which it keeps for apps whose owner has a Premium subscription. Without an account, what the Spotify app is playing and its controls still work.',
      search: 'Song, artist, album, playlist…',
      searchHint: 'Type a search, then Enter.',
      back: 'Back to playlists',
      playAll: 'Play in Spotify',
      playItem: 'Play “{{name}}” in Spotify',
      retry: 'Try again',
      nothing: 'Nothing here yet.',
      openPlaylist: 'See the songs',
      openInSpotify: 'Open in Spotify',
      'kind.album': 'Album',
      'kind.artist': 'Artist',
      'kind.playlist': 'Playlist'
    }
  }
})
